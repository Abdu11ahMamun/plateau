package fr.plateau.backend.timeclock.data;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionFlagResolutionRepository extends JpaRepository<SessionFlagResolution, Long> {

    Optional<SessionFlagResolution> findByTenantIdAndSessionId(Long tenantId, Long sessionId);
}
