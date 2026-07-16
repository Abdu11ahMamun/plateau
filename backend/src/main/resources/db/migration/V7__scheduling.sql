CREATE TABLE schedule_weeks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    week_start_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tenant_week (tenant_id, week_start_date)
);

CREATE TABLE shift_templates (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    slot VARCHAR(5) NOT NULL,
    default_start TIME NOT NULL,
    default_end TIME NOT NULL,
    break_minutes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shifts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    week_id BIGINT NOT NULL,
    user_id BIGINT NULL,
    shift_date DATE NOT NULL,
    slot VARCHAR(5) NOT NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    is_covering BOOLEAN NOT NULL DEFAULT FALSE,
    covering_for_user_id BIGINT NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shift_week FOREIGN KEY (week_id) REFERENCES schedule_weeks(id),
    CONSTRAINT fk_shift_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_tenant_user_date_slot (tenant_id, user_id, shift_date, slot)
);

CREATE INDEX idx_shifts_tenant_date ON shifts (tenant_id, shift_date);

-- Seed two default templates for tenant 1, for immediate testability
INSERT INTO shift_templates (tenant_id, name, slot, default_start, default_end, break_minutes)
VALUES
  (1, 'Matin', 'M', '10:00:00', '18:00:00', 20),
  (1, 'Soir', 'S', '18:00:00', '23:00:00', 0);
