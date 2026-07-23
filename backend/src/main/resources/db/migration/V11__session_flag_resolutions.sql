CREATE TABLE session_flag_resolutions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    session_id BIGINT NOT NULL,
    resolved_by_user_id BIGINT NOT NULL,
    resolution VARCHAR(20) NOT NULL,
    note VARCHAR(500) NULL,
    resolved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_flagres_session FOREIGN KEY (session_id) REFERENCES sessions(id)
);
