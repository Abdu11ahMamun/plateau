package fr.plateau.backend.timeclock.data;

import java.time.Instant;
import java.time.LocalDate;

import fr.plateau.backend.timeclock.domain.SessionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "sessions")
public class Session {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "in_event_id", nullable = false)
    private Long inEventId;

    @Column(name = "out_event_id")
    private Long outEventId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "minutes_total")
    private Integer minutesTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Session() {
    }

    public Session(Long tenantId, Long userId, Long inEventId, LocalDate workDate, SessionStatus status) {
        this.tenantId = tenantId;
        this.userId = userId;
        this.inEventId = inEventId;
        this.workDate = workDate;
        this.status = status;
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

    public Long getInEventId() {
        return inEventId;
    }

    public Long getOutEventId() {
        return outEventId;
    }

    public void setOutEventId(Long outEventId) {
        this.outEventId = outEventId;
    }

    public LocalDate getWorkDate() {
        return workDate;
    }

    public Integer getMinutesTotal() {
        return minutesTotal;
    }

    public void setMinutesTotal(Integer minutesTotal) {
        this.minutesTotal = minutesTotal;
    }

    public SessionStatus getStatus() {
        return status;
    }

    public void setStatus(SessionStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
