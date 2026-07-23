package fr.plateau.backend.timeclock.data;

import java.time.Instant;

import fr.plateau.backend.timeclock.domain.FlagResolution;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// Immutable, no setters: a resolution is the owner's permanent judgment call
// on a flagged session, never edited or re-decided (see the 409 guard in
// FlagQueueService.resolveFlagged).
@Entity
@Table(name = "session_flag_resolutions")
public class SessionFlagResolution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "resolved_by_user_id", nullable = false)
    private Long resolvedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private FlagResolution resolution;

    @Column(length = 500)
    private String note;

    @Column(name = "resolved_at", nullable = false, updatable = false)
    private Instant resolvedAt;

    protected SessionFlagResolution() {
    }

    public SessionFlagResolution(
            Long tenantId,
            Long sessionId,
            Long resolvedByUserId,
            FlagResolution resolution,
            String note
    ) {
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        this.resolvedByUserId = resolvedByUserId;
        this.resolution = resolution;
        this.note = note;
    }

    @PrePersist
    void onCreate() {
        if (resolvedAt == null) {
            resolvedAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public Long getSessionId() {
        return sessionId;
    }

    public Long getResolvedByUserId() {
        return resolvedByUserId;
    }

    public FlagResolution getResolution() {
        return resolution;
    }

    public String getNote() {
        return note;
    }

    public Instant getResolvedAt() {
        return resolvedAt;
    }
}
