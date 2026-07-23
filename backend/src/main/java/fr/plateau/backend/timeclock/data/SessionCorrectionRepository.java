package fr.plateau.backend.timeclock.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionCorrectionRepository extends JpaRepository<SessionCorrection, Long> {

    List<SessionCorrection> findByTenantIdAndSessionIdOrderByCreatedAtDesc(Long tenantId, Long sessionId);

    Optional<SessionCorrection> findFirstByTenantIdAndSessionIdOrderByCreatedAtDesc(Long tenantId, Long sessionId);
}
