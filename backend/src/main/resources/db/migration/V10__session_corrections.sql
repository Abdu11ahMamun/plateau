CREATE TABLE session_corrections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    corrected_by_user_id BIGINT NOT NULL,
    original_clock_in TIME NULL,
    original_clock_out TIME NULL,
    corrected_clock_in TIME NULL,
    corrected_clock_out TIME NULL,
    reason VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_correction_session FOREIGN KEY (session_id) REFERENCES sessions(id)
);
