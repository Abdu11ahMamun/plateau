package fr.plateau.backend.timeclock.data;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionRepository extends JpaRepository<Session, Long> {

    Optional<Session> findByUserIdAndTenantIdAndOutEventIdIsNull(Long userId, Long tenantId);

    @Query("SELECT s FROM Session s WHERE s.tenantId = :tenantId AND s.outEventId IS NULL")
    List<Session> findOpenSessions(@Param("tenantId") Long tenantId);
}
