package fr.plateau.backend.employee.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<Contract, Long> {

    List<Contract> findByUserIdAndTenantId(Long userId, Long tenantId);

    Optional<Contract> findFirstByUserIdAndTenantIdOrderByCreatedAtDesc(Long userId, Long tenantId);
}