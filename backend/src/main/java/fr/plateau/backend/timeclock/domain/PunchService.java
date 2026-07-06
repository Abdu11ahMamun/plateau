package fr.plateau.backend.timeclock.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEvent;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

@Service
public class PunchService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Europe/Paris");

    private final TimeEventRepository timeEventRepository;
    private final SessionRepository sessionRepository;

    public PunchService(TimeEventRepository timeEventRepository, SessionRepository sessionRepository) {
        this.timeEventRepository = timeEventRepository;
        this.sessionRepository = sessionRepository;
    }

    @Transactional
    public PunchOutcome punch(Long userId, Long tenantId, PunchMethod method, String note) {
        Optional<Session> openSession = sessionRepository.findByUserIdAndTenantIdAndOutEventIdIsNull(userId, tenantId);

        PunchResult result = PunchEvaluator.evaluate(method.name(), openSession.isPresent());

        TimeEvent event = timeEventRepository.save(new TimeEvent(
                tenantId, userId, EventType.valueOf(result.type()), method,
                Instant.now(), result.trustScore(), note));

        Integer sessionMinutes = null;
        if (event.getType() == EventType.IN) {
            sessionRepository.save(new Session(
                    tenantId, userId, event.getId(),
                    LocalDate.now(BUSINESS_ZONE),
                    SessionStatus.valueOf(result.sessionStatus())));
        } else {
            Session session = openSession.orElseThrow();
            TimeEvent inEvent = timeEventRepository.findById(session.getInEventId())
                    .orElseThrow(() -> new NotFoundException("IN event " + session.getInEventId() + " not found"));
            sessionMinutes = (int) Duration.between(inEvent.getEventTime(), event.getEventTime()).toMinutes();
            session.setOutEventId(event.getId());
            session.setMinutesTotal(sessionMinutes);
            session.setStatus(SessionStatus.valueOf(result.sessionStatus()));
        }

        return new PunchOutcome(result.type(), event.getEventTime(), sessionMinutes);
    }

    public record PunchOutcome(String type, Instant eventTime, Integer sessionMinutes) {
    }
}
