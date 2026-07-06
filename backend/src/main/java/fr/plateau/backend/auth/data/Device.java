package fr.plateau.backend.auth.data;

import java.time.Instant;

import fr.plateau.backend.auth.domain.DeviceAttestation;
import fr.plateau.backend.auth.domain.DeviceStatus;
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
@Table(name = "devices")
public class Device {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "install_id", nullable = false, length = 36)
    private String installId;

    @Column(nullable = false, length = 10)
    private String platform;

    @Lob
    @Column(name = "public_key", nullable = false, length = 65535)
    private String publicKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeviceAttestation attestation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DeviceStatus status;

    @Column(name = "enrolled_at", nullable = false, updatable = false)
    private Instant enrolledAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected Device() {
    }

    public Device(Long userId, String installId, String platform, String publicKey,
            DeviceAttestation attestation, DeviceStatus status) {
        this.userId = userId;
        this.installId = installId;
        this.platform = platform;
        this.publicKey = publicKey;
        this.attestation = attestation;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        if (enrolledAt == null) {
            enrolledAt = Instant.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getInstallId() {
        return installId;
    }

    public String getPlatform() {
        return platform;
    }

    public String getPublicKey() {
        return publicKey;
    }

    public DeviceAttestation getAttestation() {
        return attestation;
    }

    public DeviceStatus getStatus() {
        return status;
    }

    public void setStatus(DeviceStatus status) {
        this.status = status;
    }

    public Instant getEnrolledAt() {
        return enrolledAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }
}
