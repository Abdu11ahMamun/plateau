CREATE TABLE nfc_tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    uid VARCHAR(50) NOT NULL,
    label VARCHAR(50) NOT NULL DEFAULT 'entrance',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tag_uid (tenant_id, uid)
);

CREATE TABLE time_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    type VARCHAR(5) NOT NULL,
    method VARCHAR(15) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    trust_score TINYINT NOT NULL DEFAULT 0,
    note TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    in_event_id BIGINT NOT NULL,
    out_event_id BIGINT NULL,
    work_date DATE NOT NULL,
    minutes_total INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AUTO',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_session_in FOREIGN KEY (in_event_id)
        REFERENCES time_events(id),
    CONSTRAINT fk_session_out FOREIGN KEY (out_event_id)
        REFERENCES time_events(id)
);

-- Seed one NFC tag for prototype testing
INSERT INTO nfc_tags (tenant_id, uid, label)
VALUES (1, 'PROTOTYPE-TAG-001', 'entrance');
