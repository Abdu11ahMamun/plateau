package fr.plateau.backend.timeclock.domain;

import java.time.Duration;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionCorrection;
import fr.plateau.backend.timeclock.data.SessionCorrectionRepository;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

@Service
public class CorrectionService {

    // No tenant-timezone field exists yet; same server-zone convention
    // AttendanceController already uses for wall-clock display.
    private static final ZoneId TENANT_ZONE = ZoneId.systemDefault();

    private final SessionRepository sessionRepository;
    private final SessionCorrectionRepository sessionCorrectionRepository;
    private final TimeEventRepository timeEventRepository;

    public CorrectionService(
            SessionRepository sessionRepository,
            SessionCorrectionRepository sessionCorrectionRepository,
            TimeEventRepository timeEventRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.sessionCorrectionRepository = sessionCorrectionRepository;
        this.timeEventRepository = timeEventRepository;
    }

    @Transactional
    public SessionCorrection createCorrection(
            Long tenantId,
            Long sessionId,
            Long correctedByUserId,
            LocalTime newClockIn,
            LocalTime newClockOut,
            String reason
    ) {
        Session session = findSession(tenantId, sessionId);

        if (reason == null || reason.isBlank()) {
            throw new UnprocessableEntityException("A reason is required for a session correction");
        }

        EffectiveTimes current = resolveEffectiveTimes(tenantId, session);

        // Fields not touched by this correction carry the current effective
        // value forward, so every correction row is a full before/after
        // snapshot — makes "what's the latest state" a single-row lookup.
        LocalTime resolvedClockIn = newClockIn != null ? newClockIn : current.clockIn();
        LocalTime resolvedClockOut = newClockOut != null ? newClockOut : current.clockOut();

        boolean unchanged = Objects.equals(resolvedClockIn, current.clockIn())
                && Objects.equals(resolvedClockOut, current.clockOut());
        if (unchanged) {
            throw new UnprocessableEntityException("No change from current values");
        }

        if (resolvedClockIn != null && resolvedClockOut != null && !resolvedClockOut.isAfter(resolvedClockIn)) {
            throw new UnprocessableEntityException("Clock-out must be after clock-in");
        }

        SessionCorrection correction = new SessionCorrection(
                tenantId,
                sessionId,
                correctedByUserId,
                current.clockIn(),
                current.clockOut(),
                resolvedClockIn,
                resolvedClockOut,
                reason
        );

        return sessionCorrectionRepository.save(correction);
    }

    @Transactional(readOnly = true)
    public List<SessionCorrection> getCorrectionHistory(Long tenantId, Long sessionId) {
        findSession(tenantId, sessionId);
        return sessionCorrectionRepository.findByTenantIdAndSessionIdOrderByCreatedAtDesc(tenantId, sessionId);
    }

    /// The session's current effective clock-in/out: the latest correction's
    /// values if one exists, otherwise the times as originally punched.
    @Transactional(readOnly = true)
    public EffectiveTimes resolveEffectiveTimes(Long tenantId, Session session) {
        Optional<SessionCorrection> latest = sessionCorrectionRepository
                .findFirstByTenantIdAndSessionIdOrderByCreatedAtDesc(tenantId, session.getId());

        if (latest.isPresent()) {
            SessionCorrection correction = latest.get();
            return new EffectiveTimes(correction.getCorrectedClockIn(), correction.getCorrectedClockOut(), true);
        }

        LocalTime clockIn = timeEventRepository.findById(session.getInEventId())
                .map(event -> event.getEventTime().atZone(TENANT_ZONE).toLocalTime())
                .orElse(null);
        LocalTime clockOut = session.getOutEventId() == null
                ? null
                : timeEventRepository.findById(session.getOutEventId())
                        .map(event -> event.getEventTime().atZone(TENANT_ZONE).toLocalTime())
                        .orElse(null);

        return new EffectiveTimes(clockIn, clockOut, false);
    }

    /// Effective duration in minutes, honoring any correction. Falls back to
    /// the session's stored minutesTotal when there's no correction, since
    /// that value was already computed precisely from the raw punch Instants.
    @Transactional(readOnly = true)
    public Integer resolveEffectiveMinutes(Long tenantId, Session session) {
        EffectiveTimes times = resolveEffectiveTimes(tenantId, session);
        if (!times.hasCorrection()) {
            return session.getMinutesTotal();
        }
        if (times.clockIn() == null || times.clockOut() == null) {
            return null;
        }
        return (int) Duration.between(times.clockIn(), times.clockOut()).toMinutes();
    }

    private Session findSession(Long tenantId, Long sessionId) {
        return sessionRepository.findById(sessionId)
                .filter(s -> tenantId.equals(s.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Session " + sessionId + " not found"));
    }

    public record EffectiveTimes(LocalTime clockIn, LocalTime clockOut, boolean hasCorrection) {
    }
}
