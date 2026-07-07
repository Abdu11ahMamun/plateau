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

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEvent;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

@RestController
@RequestMapping("/api/admin/attendance")
public class AttendanceController {

    // No tenant-timezone field exists yet; format wall-clock times in the
    // server's zone so they match the rest of the app on this deployment.
    private static final ZoneId TENANT_ZONE = ZoneId.systemDefault();
    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final SessionRepository sessionRepository;
    private final TimeEventRepository timeEventRepository;
    private final EmployeeRepository employeeRepository;

    public AttendanceController(SessionRepository sessionRepository, TimeEventRepository timeEventRepository,
            EmployeeRepository employeeRepository) {
        this.sessionRepository = sessionRepository;
        this.timeEventRepository = timeEventRepository;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping
    public List<AttendanceRow> attendance(@RequestParam("month") String month) {
        String role = SecurityUtils.getCurrentRole();
        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Requires OWNER or MANAGER role");
        }

        YearMonth ym;
        try {
            ym = YearMonth.parse(month); // expects "YYYY-MM"
        } catch (Exception e) {
            throw new UnprocessableEntityException("month must be YYYY-MM");
        }

        Long tenantId = SecurityUtils.getCurrentTenantId();
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.plusMonths(1).atDay(1);

        return sessionRepository.findByMonth(tenantId, start, end).stream()
                .map(this::toRow)
                // date DESC, then clock-in ASC within the day.
                .sorted(Comparator.comparing(AttendanceRow::date).reversed()
                        .thenComparing(AttendanceRow::clockIn))
                .toList();
    }

    private AttendanceRow toRow(Session session) {
        TimeEvent in = timeEventRepository.findById(session.getInEventId()).orElse(null);
        TimeEvent out = session.getOutEventId() == null
                ? null
                : timeEventRepository.findById(session.getOutEventId()).orElse(null);
        Employee employee = employeeRepository.findById(session.getUserId()).orElse(null);

        String name = employee != null ? employee.getName() : "Unknown";
        String clockIn = in != null ? formatTime(in.getEventTime()) : null;
        String clockOut = out != null ? formatTime(out.getEventTime()) : null;
        String method = in != null ? in.getMethod().name() : null;
        String status = session.getStatus().name();

        return new AttendanceRow(
                session.getUserId(),
                name,
                session.getWorkDate().toString(), // ISO yyyy-MM-dd
                clockIn,
                clockOut,
                session.getMinutesTotal(),
                method,
                status,
                !"AUTO".equals(status));
    }

    private static String formatTime(Instant instant) {
        return instant.atZone(TENANT_ZONE).toLocalTime().format(HH_MM);
    }

    public record AttendanceRow(
            Long userId,
            String name,
            String date,
            String clockIn,
            String clockOut,
            Integer durationMinutes,
            String method,
            String status,
            boolean flagged) {
    }
}
