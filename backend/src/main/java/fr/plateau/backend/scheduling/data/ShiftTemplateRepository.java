package fr.plateau.backend.scheduling.data;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftTemplateRepository extends JpaRepository<ShiftTemplate, Long> {

    List<ShiftTemplate> findByTenantId(Long tenantId);
}
