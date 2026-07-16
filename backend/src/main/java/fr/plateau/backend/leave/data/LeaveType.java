package fr.plateau.backend.leave.data;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "leave_types")
public class LeaveType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "requires_approval", nullable = false)
    private boolean requiresApproval;

    @Column(nullable = false)
    private boolean paid;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected LeaveType() {
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

    public boolean isRequiresApproval() {
        return requiresApproval;
    }

    public boolean isPaid() {
        return paid;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
