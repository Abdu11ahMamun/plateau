package fr.plateau.backend.timeclock.data;

import java.time.Instant;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

// Append-only by design: no setters. Every correction is a new row layered
// on top of the session, never an edit-in-place — legal/audit requirement.
@Entity
@Table(name = "session_corrections")
public class SessionCorrection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "corrected_by_user_id", nullable = false)
    private Long correctedByUserId;

    @Column(name = "original_clock_in")
    private LocalTime originalClockIn;

    @Column(name = "original_clock_out")
    private LocalTime originalClockOut;

    @Column(name = "corrected_clock_in")
    private LocalTime correctedClockIn;

    @Column(name = "corrected_clock_out")
    private LocalTime correctedClockOut;

    @Column(nullable = false, length = 500)
    private String reason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected SessionCorrection() {
    }

    public SessionCorrection(
            Long tenantId,
            Long sessionId,
            Long correctedByUserId,
            LocalTime originalClockIn,
            LocalTime originalClockOut,
            LocalTime correctedClockIn,
            LocalTime correctedClockOut,
            String reason
    ) {
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        this.correctedByUserId = correctedByUserId;
        this.originalClockIn = originalClockIn;
        this.originalClockOut = originalClockOut;
        this.correctedClockIn = correctedClockIn;
        this.correctedClockOut = correctedClockOut;
        this.reason = reason;
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

    public Long getSessionId() {
        return sessionId;
    }

    public Long getCorrectedByUserId() {
        return correctedByUserId;
    }

    public LocalTime getOriginalClockIn() {
        return originalClockIn;
    }

    public LocalTime getOriginalClockOut() {
        return originalClockOut;
    }

    public LocalTime getCorrectedClockIn() {
        return correctedClockIn;
    }

    public LocalTime getCorrectedClockOut() {
        return correctedClockOut;
    }

    public String getReason() {
        return reason;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
