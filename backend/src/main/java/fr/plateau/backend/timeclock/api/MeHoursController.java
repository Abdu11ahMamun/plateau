package fr.plateau.backend.timeclock.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEvent;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

/// The signed-in employee's own sessions for a month. Any authenticated role.
@RestController
@RequestMapping("/api/me/hours")
public class MeHoursController {

    private static final ZoneId TENANT_ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final SessionRepository sessionRepository;
    private final TimeEventRepository timeEventRepository;

    public MeHoursController(SessionRepository sessionRepository, TimeEventRepository timeEventRepository) {
        this.sessionRepository = sessionRepository;
        this.timeEventRepository = timeEventRepository;
    }

    @GetMapping
    public List<HoursRow> myHours(@RequestParam("month") String month) {
        YearMonth ym;
        try {
            ym = YearMonth.parse(month); // "YYYY-MM"
        } catch (Exception e) {
            throw new UnprocessableEntityException("month must be YYYY-MM");
        }

        Long userId = SecurityUtils.getCurrentUserId();
        Long tenantId = SecurityUtils.getCurrentTenantId();
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.plusMonths(1).atDay(1);

        return sessionRepository.findByUserAndMonth(tenantId, userId, start, end).stream()
                .map(this::toRow)
                // work_date ASC, then clock-in ASC within the day.
                .sorted(Comparator.comparing(HoursRow::date).thenComparing(HoursRow::clockIn))
                .toList();
    }

    private HoursRow toRow(Session session) {
        TimeEvent in = timeEventRepository.findById(session.getInEventId()).orElse(null);
        TimeEvent out = session.getOutEventId() == null
                ? null
                : timeEventRepository.findById(session.getOutEventId()).orElse(null);

        return new HoursRow(
                session.getWorkDate().toString(),
                in != null ? formatTime(in.getEventTime()) : null,
                out != null ? formatTime(out.getEventTime()) : null,
                session.getMinutesTotal(),
                in != null ? in.getMethod().name() : null,
                session.getStatus().name());
    }

    private static String formatTime(Instant instant) {
        return instant.atZone(TENANT_ZONE).toLocalTime().format(HH_MM);
    }

    public record HoursRow(
            String date,
            String clockIn,
            String clockOut,
            Integer durationMinutes,
            String method,
            String status) {
    }
}
