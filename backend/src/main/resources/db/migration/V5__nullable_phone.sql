-- Phone becomes optional: employees can be invited by email alone.
-- The UNIQUE(tenant_id, phone) index still holds — MySQL allows multiple NULLs
-- in a unique index, so several phone-less employees can coexist.
ALTER TABLE users MODIFY phone VARCHAR(20) NULL;
