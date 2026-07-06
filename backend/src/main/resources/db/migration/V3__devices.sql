CREATE TABLE devices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    install_id VARCHAR(36) NOT NULL,
    platform VARCHAR(10) NOT NULL DEFAULT 'ANDROID',
    public_key TEXT NOT NULL,
    attestation VARCHAR(20) NOT NULL DEFAULT 'DEV_BYPASS',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    enrolled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_install_id (install_id)
);
