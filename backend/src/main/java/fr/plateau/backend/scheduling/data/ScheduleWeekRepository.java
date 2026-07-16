package fr.plateau.backend.scheduling.data;

import java.time.LocalDate;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleWeekRepository extends JpaRepository<ScheduleWeek, Long> {

    Optional<ScheduleWeek> findByTenantIdAndWeekStartDate(Long tenantId, LocalDate weekStartDate);
}
