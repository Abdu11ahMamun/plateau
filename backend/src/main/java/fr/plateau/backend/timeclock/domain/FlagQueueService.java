package fr.plateau.backend.timeclock.domain;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionFlagResolution;
import fr.plateau.backend.timeclock.data.SessionFlagResolutionRepository;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEvent;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

@Service
public class FlagQueueService {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private final SessionRepository sessionRepository;
    private final SessionFlagResolutionRepository resolutionRepository;
    private final TimeEventRepository timeEventRepository;
    private final EmployeeRepository employeeRepository;
    private final CorrectionService correctionService;

    public FlagQueueService(
            SessionRepository sessionRepository,
            SessionFlagResolutionRepository resolutionRepository,
            TimeEventRepository timeEventRepository,
            EmployeeRepository employeeRepository,
            CorrectionService correctionService
    ) {
        this.sessionRepository = sessionRepository;
        this.resolutionRepository = resolutionRepository;
        this.timeEventRepository = timeEventRepository;
        this.employeeRepository = employeeRepository;
        this.correctionService = correctionService;
    }

    @Transactional(readOnly = true)
    public List<FlaggedSessionView> getFlaggedSessions(Long tenantId, Boolean resolved) {
        return sessionRepository.findByTenantIdAndStatusIn(tenantId, List.of(SessionStatus.FLAGGED, SessionStatus.REVIEW))
                .stream()
                .map(session -> toView(tenantId, session))
                .filter(view -> resolved == null || resolved == (view.resolution() != null))
                .sorted(Comparator.comparing(FlaggedSessionView::date).reversed())
                .toList();
    }

    @Transactional
    public SessionFlagResolution resolveFlagged(
            Long tenantId,
            Long sessionId,
            Long resolvedByUserId,
            String resolutionValue,
            String note
    ) {
        Session session = sessionRepository.findById(sessionId)
                .filter(s -> tenantId.equals(s.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Session " + sessionId + " not found"));

        if (session.getStatus() != SessionStatus.FLAGGED && session.getStatus() != SessionStatus.REVIEW) {
            throw new ConflictException("This session is not flagged");
        }

        if (resolutionRepository.findByTenantIdAndSessionId(tenantId, sessionId).isPresent()) {
            throw new ConflictException("This flag has already been resolved");
        }

        FlagResolution resolution;
        try {
            resolution = FlagResolution.valueOf(resolutionValue);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new UnprocessableEntityException("resolution must be APPROVED or REJECTED");
        }

        // REJECTED intentionally does NOT exclude the session from payroll/
        // reports yet — it only records the owner's judgment. Automatic
        // exclusion-from-payroll on reject is a follow-up product decision,
        // not built here (deleting/zeroing a session needs its own legal
        // review, same reasoning as why corrections are additive-only).
        SessionFlagResolution saved = resolutionRepository.save(
                new SessionFlagResolution(tenantId, sessionId, resolvedByUserId, resolution, note));

        return saved;
    }

    private FlaggedSessionView toView(Long tenantId, Session session) {
        TimeEvent inEvent = timeEventRepository.findById(session.getInEventId()).orElse(null);
        Employee employee = employeeRepository.findById(session.getUserId()).orElse(null);
        CorrectionService.EffectiveTimes effective = correctionService.resolveEffectiveTimes(tenantId, session);
        Integer durationMinutes = correctionService.resolveEffectiveMinutes(tenantId, session);

        ResolutionView resolutionView = resolutionRepository.findByTenantIdAndSessionId(tenantId, session.getId())
                .map(this::toResolutionView)
                .orElse(null);

        return new FlaggedSessionView(
                session.getId(),
                session.getUserId(),
                employee != null ? employee.getName() : "Unknown",
                session.getWorkDate().toString(),
                effective.clockIn() != null ? effective.clockIn().format(HH_MM) : null,
                effective.clockOut() != null ? effective.clockOut().format(HH_MM) : null,
                durationMinutes,
                inEvent != null ? inEvent.getMethod().name() : null,
                inEvent != null ? inEvent.getTrustScore() : null,
                session.getStatus().name(),
                resolutionView
        );
    }

    private ResolutionView toResolutionView(SessionFlagResolution resolution) {
        Employee resolver = employeeRepository.findById(resolution.getResolvedByUserId()).orElse(null);
        return new ResolutionView(
                resolution.getResolvedByUserId(),
                resolver != null ? resolver.getName() : "Unknown",
                resolution.getResolution().name(),
                resolution.getNote(),
                resolution.getResolvedAt()
        );
    }

    public record FlaggedSessionView(
            Long sessionId,
            Long userId,
            String employeeName,
            String date,
            String clockIn,
            String clockOut,
            Integer durationMinutes,
            String method,
            Byte trustScore,
            String status,
            ResolutionView resolution
    ) {
    }

    public record ResolutionView(
            Long resolvedByUserId,
            String resolvedByName,
            String resolution,
            String note,
            Instant resolvedAt
    ) {
    }
}
