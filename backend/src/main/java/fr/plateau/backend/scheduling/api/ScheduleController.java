package fr.plateau.backend.scheduling.api;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.scheduling.data.ScheduleWeek;
import fr.plateau.backend.scheduling.data.Shift;
import fr.plateau.backend.scheduling.data.ShiftTemplate;
import fr.plateau.backend.scheduling.data.ShiftTemplateRepository;
import fr.plateau.backend.scheduling.domain.ScheduleService;
import fr.plateau.backend.scheduling.domain.ShiftStatus;
import fr.plateau.backend.scheduling.domain.Slot;

@RestController
@RequestMapping("/api/admin/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;
    private final ShiftTemplateRepository shiftTemplateRepository;

    public ScheduleController(ScheduleService scheduleService, ShiftTemplateRepository shiftTemplateRepository) {
        this.scheduleService = scheduleService;
        this.shiftTemplateRepository = shiftTemplateRepository;
    }

    @GetMapping("/week")
    public WeekWithShifts getWeek(@RequestParam("start") LocalDate start) {
        requireOwnerOrManager();
        Long tenantId = SecurityUtils.getCurrentTenantId();

        ScheduleWeek week = scheduleService.getOrCreateWeek(tenantId, start);
        List<Shift> shifts = scheduleService.getWeekShifts(tenantId, start);

        return toWeekWithShifts(week, shifts);
    }

    @PostMapping("/shifts")
    public Shift upsertShift(@RequestBody ShiftRequest request) {
        requireOwnerOrManager();
        Long tenantId = SecurityUtils.getCurrentTenantId();

        ScheduleWeek week = scheduleService.getOrCreateWeek(tenantId, request.weekStartDate());

        return scheduleService.upsertShift(
                tenantId,
                week.getId(),
                request.userId(),
                request.date(),
                request.slot(),
                request.startTime(),
                request.endTime(),
                request.status() != null ? request.status() : ShiftStatus.SCHEDULED,
                request.note(),
                request.breakMinutes()
        );
    }

    @DeleteMapping("/shifts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShift(@PathVariable Long id) {
        requireOwnerOrManager();
        scheduleService.deleteShift(SecurityUtils.getCurrentTenantId(), id);
    }

    @PostMapping("/week/{weekId}/publish")
    public ScheduleWeek publish(@PathVariable Long weekId) {
        requireOwnerOrManager();
        return scheduleService.publishWeek(SecurityUtils.getCurrentTenantId(), weekId);
    }

    @PostMapping("/week/{weekId}/unpublish")
    public ScheduleWeek unpublish(@PathVariable Long weekId) {
        requireOwnerOrManager();
        return scheduleService.unpublishWeek(
                SecurityUtils.getCurrentTenantId(), weekId, SecurityUtils.getCurrentRole());
    }

    @PostMapping("/copy")
    public WeekWithShifts copy(@RequestBody CopyRequest request) {
        requireOwnerOrManager();
        Long tenantId = SecurityUtils.getCurrentTenantId();

        List<Shift> shifts = scheduleService.copyWeek(
                tenantId, request.sourceWeekStartDate(), request.targetWeekStartDate());
        ScheduleWeek targetWeek = scheduleService.getOrCreateWeek(tenantId, request.targetWeekStartDate());

        return toWeekWithShifts(targetWeek, shifts);
    }

    @PostMapping("/shifts/{id}/needs-covering")
    public Shift markNeedsCovering(@PathVariable Long id) {
        requireOwnerOrManager();
        return scheduleService.markNeedsCovering(SecurityUtils.getCurrentTenantId(), id);
    }

    @PostMapping("/shifts/{id}/assign-coverer")
    public Shift assignCoverer(@PathVariable Long id, @RequestBody AssignCovererRequest request) {
        requireOwnerOrManager();
        return scheduleService.assignCoverer(SecurityUtils.getCurrentTenantId(), id, request.coveringUserId());
    }

    @GetMapping("/templates")
    public List<ShiftTemplate> templates() {
        requireOwnerOrManager();
        return shiftTemplateRepository.findByTenantId(SecurityUtils.getCurrentTenantId());
    }

    @PutMapping("/templates/{id}")
    public ShiftTemplate updateTemplate(@PathVariable Long id, @RequestBody UpdateTemplateRequest request) {
        requireOwnerOrManager();

        if (request.breakMinutes() < 0 || request.breakMinutes() > 120) {
            throw new UnprocessableEntityException("breakMinutes must be between 0 and 120");
        }

        ShiftTemplate template = shiftTemplateRepository.findById(id)
                .filter(t -> SecurityUtils.getCurrentTenantId().equals(t.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Shift template " + id + " not found"));

        template.setBreakMinutes(request.breakMinutes());
        return shiftTemplateRepository.save(template);
    }

    private WeekWithShifts toWeekWithShifts(ScheduleWeek week, List<Shift> shifts) {
        return new WeekWithShifts(
                new WeekView(week.getId(), week.getWeekStartDate(), week.getStatus().name()),
                shifts
        );
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Only OWNER or MANAGER can manage the schedule");
        }
    }

    public record ShiftRequest(
            LocalDate weekStartDate,
            Long userId,
            LocalDate date,
            Slot slot,
            LocalTime startTime,
            LocalTime endTime,
            ShiftStatus status,
            String note,
            Integer breakMinutes
    ) {
    }

    public record CopyRequest(LocalDate sourceWeekStartDate, LocalDate targetWeekStartDate) {
    }

    public record AssignCovererRequest(Long coveringUserId) {
    }

    public record UpdateTemplateRequest(int breakMinutes) {
    }

    public record WeekView(Long id, LocalDate weekStartDate, String status) {
    }

    public record WeekWithShifts(WeekView week, List<Shift> shifts) {
    }
}
