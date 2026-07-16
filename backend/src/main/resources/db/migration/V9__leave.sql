CREATE TABLE leave_types (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    paid BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    leave_type_id BIGINT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    half_day VARCHAR(5) NULL,
    reason VARCHAR(500) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP NULL,
    decided_by_user_id BIGINT NULL,
    decision_note VARCHAR(500) NULL,
    CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_leave_type FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
);

CREATE INDEX idx_leave_tenant_status ON leave_requests (tenant_id, status);
CREATE INDEX idx_leave_tenant_dates ON leave_requests (tenant_id, start_date, end_date);

-- Seed default leave types for tenant 1
INSERT INTO leave_types (tenant_id, name, requires_approval, paid) VALUES
  (1, 'Congés payés', TRUE, TRUE),
  (1, 'Maladie', FALSE, TRUE),
  (1, 'Sans solde', TRUE, FALSE);
