package fr.plateau.backend.leave.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.leave.data.LeaveRequest;
import fr.plateau.backend.leave.data.LeaveRequestRepository;
import fr.plateau.backend.leave.data.LeaveType;
import fr.plateau.backend.leave.data.LeaveTypeRepository;
import fr.plateau.backend.scheduling.data.ShiftRepository;
import fr.plateau.backend.scheduling.domain.ShiftStatus;

@Service
public class LeaveService {

    private final LeaveRequestRepository leaveRequestRepository;
    private final LeaveTypeRepository leaveTypeRepository;
    private final ShiftRepository shiftRepository;

    public LeaveService(
            LeaveRequestRepository leaveRequestRepository,
            LeaveTypeRepository leaveTypeRepository,
            ShiftRepository shiftRepository
    ) {
        this.leaveRequestRepository = leaveRequestRepository;
        this.leaveTypeRepository = leaveTypeRepository;
        this.shiftRepository = shiftRepository;
    }

    @Transactional
    public CreateOutcome createRequest(
            Long tenantId,
            Long userId,
            Long leaveTypeId,
            LocalDate startDate,
            LocalDate endDate,
            HalfDay halfDay,
            String reason
    ) {
        LeaveType leaveType = leaveTypeRepository.findById(leaveTypeId)
                .filter(lt -> tenantId.equals(lt.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Leave type " + leaveTypeId + " not found"));

        if (startDate.isAfter(endDate)) {
            throw new UnprocessableEntityException("End date must be on or after start date");
        }

        if (halfDay != null && !startDate.equals(endDate)) {
            throw new UnprocessableEntityException("Half-day only applies to single-day requests");
        }

        boolean overlaps = leaveRequestRepository.findByTenantIdAndDateRangeOverlap(tenantId, startDate, endDate).stream()
                .anyMatch(existing -> userId.equals(existing.getUserId())
                        && (existing.getStatus() == LeaveStatus.PENDING || existing.getStatus() == LeaveStatus.APPROVED));

        if (overlaps) {
            throw new ConflictException("You already have a leave request for overlapping dates");
        }

        // Sick leave (requires_approval=false in the seed data) auto-approves;
        // other leave types wait for an OWNER/MANAGER decision.
        LeaveStatus status = leaveType.isRequiresApproval() ? LeaveStatus.PENDING : LeaveStatus.APPROVED;

        LeaveRequest request = new LeaveRequest(tenantId, userId, leaveTypeId, startDate, endDate, halfDay, reason, status);
        LeaveRequest saved = leaveRequestRepository.save(request);

        // Informational only — does NOT block the request. An owner may have
        // approved leave for different dates than what was actually scheduled,
        // so this is surfaced to the frontend, not enforced here.
        boolean hasScheduledShifts = shiftRepository.findByTenantIdAndShiftDateBetween(tenantId, startDate, endDate).stream()
                .anyMatch(shift -> userId.equals(shift.getUserId()) && shift.getStatus() == ShiftStatus.SCHEDULED);

        return new CreateOutcome(saved, hasScheduledShifts);
    }

    @Transactional(readOnly = true)
    public List<LeaveRequest> listRequests(Long tenantId, LeaveStatus statusFilter, Long userId) {
        List<LeaveRequest> requests = statusFilter != null
                ? leaveRequestRepository.findByTenantIdAndStatus(tenantId, statusFilter)
                : leaveRequestRepository.findByTenantId(tenantId);

        return requests.stream()
                .filter(request -> userId == null || userId.equals(request.getUserId()))
                .sorted(Comparator.comparing(LeaveRequest::getRequestedAt).reversed())
                .toList();
    }

    @Transactional
    public LeaveRequest decideRequest(
            Long tenantId,
            Long requestId,
            Long decidingUserId,
            boolean approve,
            String decisionNote
    ) {
        LeaveRequest request = findRequest(tenantId, requestId);

        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("This request has already been decided");
        }

        if (!approve && (decisionNote == null || decisionNote.isBlank())) {
            throw new UnprocessableEntityException("A reason is required when rejecting a request");
        }

        request.setStatus(approve ? LeaveStatus.APPROVED : LeaveStatus.REJECTED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(decidingUserId);
        request.setDecisionNote(decisionNote);

        return leaveRequestRepository.save(request);
    }

    @Transactional
    public LeaveRequest cancelRequest(Long tenantId, Long requestId, Long requestingUserId) {
        LeaveRequest request = findRequest(tenantId, requestId);

        // "I changed my mind" — only the requester, never an admin acting on
        // their behalf. OWNER/MANAGER should reject an approved request
        // via decideRequest instead if they want to undo someone's leave.
        if (!requestingUserId.equals(request.getUserId())) {
            throw new ForbiddenException("Only the requester can cancel their own leave request");
        }

        if (request.getStatus() != LeaveStatus.PENDING) {
            throw new ConflictException("Cannot cancel a decided request — ask your manager to reject it");
        }

        request.setStatus(LeaveStatus.CANCELLED);
        return leaveRequestRepository.save(request);
    }

    @Transactional(readOnly = true)
    public boolean isUserOnApprovedLeave(Long tenantId, Long userId, LocalDate date) {
        return leaveRequestRepository.findByTenantIdAndDateRangeOverlap(tenantId, date, date).stream()
                .anyMatch(request -> userId.equals(request.getUserId()) && request.getStatus() == LeaveStatus.APPROVED);
    }

    private LeaveRequest findRequest(Long tenantId, Long requestId) {
        return leaveRequestRepository.findById(requestId)
                .filter(r -> tenantId.equals(r.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Leave request " + requestId + " not found"));
    }

    public record CreateOutcome(LeaveRequest request, boolean hasScheduledShifts) {
    }
}
