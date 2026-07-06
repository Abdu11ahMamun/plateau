package fr.plateau.backend.timeclock.data;

import java.time.Instant;

import fr.plateau.backend.timeclock.domain.EventType;
import fr.plateau.backend.timeclock.domain.PunchMethod;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "time_events")
public class TimeEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private EventType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private PunchMethod method;

    @Column(name = "event_time", nullable = false)
    private Instant eventTime;

    @Column(name = "trust_score", nullable = false)
    private byte trustScore;

    @Lob
    @Column(length = 65535)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected TimeEvent() {
    }

    public TimeEvent(Long tenantId, Long userId, EventType type, PunchMethod method,
            Instant eventTime, byte trustScore, String note) {
        this.tenantId = tenantId;
        this.userId = userId;
        this.type = type;
        this.method = method;
        this.eventTime = eventTime;
        this.trustScore = trustScore;
        this.note = note;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public Long getUserId() {
        return userId;
    }

    public EventType getType() {
        return type;
    }

    public PunchMethod getMethod() {
        return method;
    }

    public Instant getEventTime() {
        return eventTime;
    }

    public byte getTrustScore() {
        return trustScore;
    }

    public String getNote() {
        return note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
