package fr.plateau.backend.scheduling.data;

import java.time.Instant;
import java.time.LocalTime;

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

@Entity
@Table(name = "shift_templates")
public class ShiftTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 50)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 5)
    private Slot slot;

    @Column(name = "default_start", nullable = false)
    private LocalTime defaultStart;

    @Column(name = "default_end", nullable = false)
    private LocalTime defaultEnd;

    @Column(name = "break_minutes", nullable = false)
    private int breakMinutes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected ShiftTemplate() {
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

    public String getName() {
        return name;
    }

    public Slot getSlot() {
        return slot;
    }

    public LocalTime getDefaultStart() {
        return defaultStart;
    }

    public LocalTime getDefaultEnd() {
        return defaultEnd;
    }

    public int getBreakMinutes() {
        return breakMinutes;
    }

    public void setBreakMinutes(int breakMinutes) {
        this.breakMinutes = breakMinutes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
