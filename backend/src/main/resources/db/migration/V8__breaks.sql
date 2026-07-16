ALTER TABLE shifts ADD COLUMN break_minutes INT NULL AFTER end_time;
-- NULL means "use the template's default", a number means "this
-- specific shift overrides the template"

CREATE TABLE tenant_settings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tenant_setting (tenant_id, setting_key)
);

INSERT INTO tenant_settings (tenant_id, setting_key, setting_value)
VALUES (1, 'default_break_minutes', '20');
