package fr.plateau.backend.scheduling.data;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findByTenantIdAndWeekId(Long tenantId, Long weekId);

    List<Shift> findByTenantIdAndShiftDateBetween(Long tenantId, LocalDate start, LocalDate end);
}
