package fr.plateau.backend.scheduling.domain;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.TenantSettingsService;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.scheduling.data.ScheduleWeek;
import fr.plateau.backend.scheduling.data.ScheduleWeekRepository;
import fr.plateau.backend.scheduling.data.Shift;
import fr.plateau.backend.scheduling.data.ShiftRepository;
import fr.plateau.backend.scheduling.data.ShiftTemplate;
import fr.plateau.backend.scheduling.data.ShiftTemplateRepository;

@Service
public class ScheduleService {

    private final ScheduleWeekRepository scheduleWeekRepository;
    private final ShiftRepository shiftRepository;
    private final ShiftTemplateRepository shiftTemplateRepository;
    private final TenantSettingsService tenantSettingsService;

    public ScheduleService(
            ScheduleWeekRepository scheduleWeekRepository,
            ShiftRepository shiftRepository,
            ShiftTemplateRepository shiftTemplateRepository,
            TenantSettingsService tenantSettingsService
    ) {
        this.scheduleWeekRepository = scheduleWeekRepository;
        this.shiftRepository = shiftRepository;
        this.shiftTemplateRepository = shiftTemplateRepository;
        this.tenantSettingsService = tenantSettingsService;
    }

    @Transactional
    public ScheduleWeek getOrCreateWeek(Long tenantId, LocalDate weekStartDate) {
        validateMonday(weekStartDate);

        return scheduleWeekRepository.findByTenantIdAndWeekStartDate(tenantId, weekStartDate)
                .orElseGet(() -> scheduleWeekRepository.save(
                        new ScheduleWeek(tenantId, weekStartDate, WeekStatus.DRAFT)));
    }

    @Transactional(readOnly = true)
    public List<Shift> getWeekShifts(Long tenantId, LocalDate weekStartDate) {
        ScheduleWeek week = scheduleWeekRepository.findByTenantIdAndWeekStartDate(tenantId, weekStartDate)
                .orElseThrow(() -> new NotFoundException("No schedule week found for " + weekStartDate));

        return shiftsForWeek(tenantId, week.getId()).stream()
                .map(shift -> attachEffectiveBreak(tenantId, shift))
                .toList();
    }

    @Transactional
    public Shift upsertShift(
            Long tenantId,
            Long weekId,
            Long userId,
            LocalDate date,
            Slot slot,
            LocalTime startTime,
            LocalTime endTime,
            ShiftStatus status,
            String note,
            Integer breakMinutes
    ) {
        ScheduleWeek week = findWeek(tenantId, weekId);
        requireDraft(week);

        LocalDate weekEnd = week.getWeekStartDate().plusDays(6);
        if (date.isBefore(week.getWeekStartDate()) || date.isAfter(weekEnd)) {
            throw new UnprocessableEntityException(
                    "date must fall within the week's 7-day range (" + week.getWeekStartDate() + " to " + weekEnd + ")"
            );
        }

        // Multiple OPEN shifts (userId == null) may legitimately share a
        // date/slot — the DB's unique key treats NULLs as distinct, so
        // there's no existing row to match against; always insert.
        ShiftStatus effectiveStatus = userId == null ? ShiftStatus.OPEN : status;

        Shift shift = userId == null
                ? null
                : shiftRepository.findByTenantIdAndWeekId(tenantId, weekId).stream()
                        .filter(s -> userId.equals(s.getUserId()) && date.equals(s.getShiftDate()) && slot == s.getSlot())
                        .findFirst()
                        .orElse(null);

        if (shift == null) {
            shift = new Shift(tenantId, weekId, userId, date, slot, startTime, endTime, effectiveStatus, note);
        } else {
            shift.setUserId(userId);
            shift.setStartTime(startTime);
            shift.setEndTime(endTime);
            shift.setStatus(effectiveStatus);
            shift.setNote(note);
        }
        // Stored exactly as given: null means "use the template default",
        // any number (even one matching the template) becomes an explicit
        // per-shift override.
        shift.setBreakMinutes(breakMinutes);

        return attachEffectiveBreak(tenantId, shiftRepository.save(shift));
    }

    @Transactional
    public void deleteShift(Long tenantId, Long shiftId) {
        Shift shift = findShift(tenantId, shiftId);

        requireDraft(findWeek(tenantId, shift.getWeekId()));

        shiftRepository.delete(shift);
    }

    @Transactional
    public ScheduleWeek publishWeek(Long tenantId, Long weekId) {
        ScheduleWeek week = findWeek(tenantId, weekId);
        if (week.getStatus() == WeekStatus.PUBLISHED) {
            throw new ConflictException("Week is already published");
        }

        week.setStatus(WeekStatus.PUBLISHED);
        week.setPublishedAt(Instant.now());
        return week;
    }

    @Transactional
    public ScheduleWeek unpublishWeek(Long tenantId, Long weekId, String callerRole) {
        if (!"OWNER".equals(callerRole)) {
            throw new ForbiddenException("Only OWNER can unpublish a week");
        }

        ScheduleWeek week = findWeek(tenantId, weekId);
        week.setStatus(WeekStatus.DRAFT);
        week.setPublishedAt(null);
        return week;
    }

    @Transactional
    public List<Shift> copyWeek(Long tenantId, LocalDate sourceWeekStartDate, LocalDate targetWeekStartDate) {
        validateMonday(sourceWeekStartDate);
        validateMonday(targetWeekStartDate);

        ScheduleWeek sourceWeek = scheduleWeekRepository.findByTenantIdAndWeekStartDate(tenantId, sourceWeekStartDate)
                .orElseThrow(() -> new NotFoundException("No schedule week found for " + sourceWeekStartDate));

        ScheduleWeek targetWeek = getOrCreateWeek(tenantId, targetWeekStartDate);

        if (!shiftsForWeek(tenantId, targetWeek.getId()).isEmpty()) {
            throw new ConflictException("Target week already has shifts");
        }

        long dayShift = ChronoUnit.DAYS.between(sourceWeekStartDate, targetWeekStartDate);

        for (Shift shift : shiftsForWeek(tenantId, sourceWeek.getId())) {
            Shift copy = new Shift(
                    tenantId,
                    targetWeek.getId(),
                    shift.getUserId(),
                    shift.getShiftDate().plusDays(dayShift),
                    shift.getSlot(),
                    shift.getStartTime(),
                    shift.getEndTime(),
                    shift.getStatus(),
                    shift.getNote()
            );
            copy.setBreakMinutes(shift.getBreakMinutes());
            shiftRepository.save(copy);
        }

        return shiftsForWeek(tenantId, targetWeek.getId()).stream()
                .map(shift -> attachEffectiveBreak(tenantId, shift))
                .toList();
    }

    @Transactional
    public Shift markNeedsCovering(Long tenantId, Long shiftId) {
        Shift shift = findShift(tenantId, shiftId);

        // Deliberate exception to the requireDraft() rule used by upsertShift/
        // deleteShift: marking a shift as needing coverage is a real-time
        // "someone called in sick" event, not a planning-time edit, so it's
        // allowed on a PUBLISHED week too. No week-status check here.
        shift.setCoveringForUserId(shift.getUserId());
        shift.setUserId(null);
        shift.setStatus(ShiftStatus.OPEN);

        return attachEffectiveBreak(tenantId, shiftRepository.save(shift));
    }

    @Transactional
    public Shift assignCoverer(Long tenantId, Long shiftId, Long coveringUserId) {
        Shift shift = findShift(tenantId, shiftId);

        if (shift.getCoveringForUserId() == null) {
            throw new UnprocessableEntityException("This shift was not marked as needing coverage");
        }

        if (coveringUserId.equals(shift.getCoveringForUserId())) {
            throw new UnprocessableEntityException("Cannot assign the original employee as their own cover");
        }

        shift.setUserId(coveringUserId);
        shift.setStatus(ShiftStatus.SCHEDULED);
        shift.setCovering(true);
        // coveringForUserId intentionally left as-is: history of who was
        // originally supposed to work this shift, shown by the admin panel.

        return attachEffectiveBreak(tenantId, shiftRepository.save(shift));
    }

    private Shift attachEffectiveBreak(Long tenantId, Shift shift) {
        Integer effective = shift.getBreakMinutes();
        if (effective == null) {
            effective = shiftTemplateRepository.findByTenantId(tenantId).stream()
                    .filter(template -> template.getSlot() == shift.getSlot())
                    .findFirst()
                    .map(ShiftTemplate::getBreakMinutes)
                    .orElseGet(() -> tenantSettingsService.getIntSetting(
                            tenantId, TenantSettingsService.DEFAULT_BREAK_MINUTES_KEY, 20));
        }
        shift.setEffectiveBreakMinutes(effective);
        return shift;
    }

    private Shift findShift(Long tenantId, Long shiftId) {
        return shiftRepository.findById(shiftId)
                .filter(s -> tenantId.equals(s.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Shift " + shiftId + " not found"));
    }

    private List<Shift> shiftsForWeek(Long tenantId, Long weekId) {
        return shiftRepository.findByTenantIdAndWeekId(tenantId, weekId).stream()
                .sorted(Comparator.comparing(Shift::getShiftDate).thenComparing(Shift::getSlot))
                .toList();
    }

    private ScheduleWeek findWeek(Long tenantId, Long weekId) {
        return scheduleWeekRepository.findById(weekId)
                .filter(w -> tenantId.equals(w.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Schedule week " + weekId + " not found"));
    }

    private void requireDraft(ScheduleWeek week) {
        if (week.getStatus() == WeekStatus.PUBLISHED) {
            throw new ConflictException("Cannot edit a published week — unlock it first");
        }
    }

    private void validateMonday(LocalDate date) {
        if (date.getDayOfWeek() != DayOfWeek.MONDAY) {
            throw new UnprocessableEntityException("weekStartDate must be a Monday");
        }
    }
}
