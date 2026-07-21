package fr.plateau.backend.employee.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findAllByTenantId(Long tenantId);

    Optional<Employee> findByTenantIdAndEmail(Long tenantId, String email);

    Optional<Employee> findByTenantIdAndPhone(Long tenantId, String phone);

    // Unscoped by tenant: used for pre-login identifier lookup, where no
    // tenantId is known yet. email/phone are only unique PER TENANT
    // (uq_tenant_email, uq_tenant_phone), so these can legitimately return
    // more than one row — callers must handle that case explicitly.
    List<Employee> findByEmail(String email);

    List<Employee> findByPhone(String phone);
}
