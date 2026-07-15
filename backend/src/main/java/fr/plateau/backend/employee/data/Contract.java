package fr.plateau.backend.employee.data;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "contracts")
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 20)
    private String type;

    @Column(name = "weekly_minutes", nullable = false)
    private Integer weeklyMinutes;

    @Column(name = "hourly_wage_cents", nullable = false)
    private Integer hourlyWageCents;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected Contract() {
    }

    public Contract(
            Long userId,
            Long tenantId,
            String type,
            Integer weeklyMinutes,
            Integer hourlyWageCents,
            LocalDate startDate,
            LocalDate endDate
    ) {
        this.userId = userId;
        this.tenantId = tenantId;
        this.type = type;
        this.weeklyMinutes = weeklyMinutes;
        this.hourlyWageCents = hourlyWageCents;
        this.startDate = startDate;
        this.endDate = endDate;
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

    public Long getUserId() {
        return userId;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public String getType() {
        return type;
    }

    public Integer getWeeklyMinutes() {
        return weeklyMinutes;
    }

    public Integer getHourlyWageCents() {
        return hourlyWageCents;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}