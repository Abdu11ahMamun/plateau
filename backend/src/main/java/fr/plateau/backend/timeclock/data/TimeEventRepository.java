package fr.plateau.backend.timeclock.data;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TimeEventRepository extends JpaRepository<TimeEvent, Long> {

    Optional<TimeEvent> findTopByUserIdAndTenantIdOrderByEventTimeDesc(Long userId, Long tenantId);
}
