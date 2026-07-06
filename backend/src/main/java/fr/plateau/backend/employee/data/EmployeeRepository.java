package fr.plateau.backend.employee.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    List<Employee> findAllByTenantId(Long tenantId);

    Optional<Employee> findByTenantIdAndEmail(Long tenantId, String email);

    Optional<Employee> findByTenantIdAndPhone(Long tenantId, String phone);
}
