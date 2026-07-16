package fr.plateau.backend.leave.api;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.leave.data.LeaveRequest;
import fr.plateau.backend.leave.data.LeaveType;
import fr.plateau.backend.leave.data.LeaveTypeRepository;
import fr.plateau.backend.leave.domain.HalfDay;
import fr.plateau.backend.leave.domain.LeaveService;
import fr.plateau.backend.leave.domain.LeaveStatus;

@RestController
public class LeaveController {

    private final LeaveService leaveService;
    private final LeaveTypeRepository leaveTypeRepository;

    public LeaveController(LeaveService leaveService, LeaveTypeRepository leaveTypeRepository) {
        this.leaveService = leaveService;
        this.leaveTypeRepository = leaveTypeRepository;
    }

    @GetMapping("/api/leave/types")
    public List<LeaveType> types() {
        return leaveTypeRepository.findByTenantId(SecurityUtils.getCurrentTenantId());
    }

    @PostMapping("/api/leave/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveRequest create(@RequestBody CreateLeaveRequest request) {
        return leaveService.createRequest(
                SecurityUtils.getCurrentTenantId(),
                SecurityUtils.getCurrentUserId(),
                request.leaveTypeId(),
                request.startDate(),
                request.endDate(),
                request.halfDay(),
                request.reason()
        );
    }

    @GetMapping("/api/leave/requests/me")
    public List<LeaveRequest> myRequests() {
        return leaveService.listRequests(SecurityUtils.getCurrentTenantId(), null, SecurityUtils.getCurrentUserId());
    }

    @PostMapping("/api/leave/requests/{id}/cancel")
    public LeaveRequest cancel(@PathVariable Long id) {
        return leaveService.cancelRequest(SecurityUtils.getCurrentTenantId(), id, SecurityUtils.getCurrentUserId());
    }

    @GetMapping("/api/admin/leave/requests")
    public List<LeaveRequest> adminList(@RequestParam(value = "status", required = false) LeaveStatus status) {
        requireOwnerOrManager();
        return leaveService.listRequests(SecurityUtils.getCurrentTenantId(), status, null);
    }

    @PostMapping("/api/admin/leave/requests/{id}/approve")
    public LeaveRequest approve(@PathVariable Long id, @RequestBody DecisionRequest request) {
        requireOwnerOrManager();
        return leaveService.decideRequest(
                SecurityUtils.getCurrentTenantId(), id, SecurityUtils.getCurrentUserId(), true, request.note());
    }

    @PostMapping("/api/admin/leave/requests/{id}/reject")
    public LeaveRequest reject(@PathVariable Long id, @RequestBody DecisionRequest request) {
        requireOwnerOrManager();
        return leaveService.decideRequest(
                SecurityUtils.getCurrentTenantId(), id, SecurityUtils.getCurrentUserId(), false, request.note());
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Only OWNER or MANAGER can manage leave requests");
        }
    }

    public record CreateLeaveRequest(
            Long leaveTypeId,
            LocalDate startDate,
            LocalDate endDate,
            HalfDay halfDay,
            String reason
    ) {
    }

    public record DecisionRequest(String note) {
    }
}
