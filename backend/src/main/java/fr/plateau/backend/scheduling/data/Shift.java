package fr.plateau.backend.scheduling.data;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

import fr.plateau.backend.scheduling.domain.ShiftStatus;
import fr.plateau.backend.scheduling.domain.Slot;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;

@Entity
@Table(name = "shifts")
public class Shift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "week_id", nullable = false)
    private Long weekId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "shift_date", nullable = false)
    private LocalDate shiftDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private Slot slot;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "break_minutes")
    private Integer breakMinutes;

    @Transient
    private Integer effectiveBreakMinutes;

    @Transient
    private boolean onApprovedLeave;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShiftStatus status;

    @Column(name = "is_covering", nullable = false)
    private boolean covering;

    @Column(name = "covering_for_user_id")
    private Long coveringForUserId;

    @Column(length = 255)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Shift() {
    }

    public Shift(Long tenantId, Long weekId, Long userId, LocalDate shiftDate, Slot slot,
            LocalTime startTime, LocalTime endTime, ShiftStatus status, String note) {
        this.tenantId = tenantId;
        this.weekId = weekId;
        this.userId = userId;
        this.shiftDate = shiftDate;
        this.slot = slot;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = status;
        this.note = note;
        this.covering = false;
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

    public Long getWeekId() {
        return weekId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDate getShiftDate() {
        return shiftDate;
    }

    public Slot getSlot() {
        return slot;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public Integer getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(Integer breakMinutes) {
        this.breakMinutes = breakMinutes;
    }

    public Integer getEffectiveBreakMinutes() {
        return effectiveBreakMinutes;
    }

    public void setEffectiveBreakMinutes(Integer effectiveBreakMinutes) {
        this.effectiveBreakMinutes = effectiveBreakMinutes;
    }

    public boolean isOnApprovedLeave() {
        return onApprovedLeave;
    }

    public void setOnApprovedLeave(boolean onApprovedLeave) {
        this.onApprovedLeave = onApprovedLeave;
    }

    public ShiftStatus getStatus() {
        return status;
    }

    public void setStatus(ShiftStatus status) {
        this.status = status;
    }

    public boolean isCovering() {
        return covering;
    }

    public void setCovering(boolean covering) {
        this.covering = covering;
    }

    public Long getCoveringForUserId() {
        return coveringForUserId;
    }

    public void setCoveringForUserId(Long coveringForUserId) {
        this.coveringForUserId = coveringForUserId;
    }

    public String getNote() {
        return note;
    }

    public void setNote(String note) {
        this.note = note;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
