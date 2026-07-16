package fr.plateau.backend.timeclock.data;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionRepository extends JpaRepository<Session, Long> {

    Optional<Session> findByUserIdAndTenantIdAndOutEventIdIsNull(Long userId, Long tenantId);

    @Query("SELECT s FROM Session s WHERE s.tenantId = :tenantId AND s.outEventId IS NULL")
    List<Session> findOpenSessions(@Param("tenantId") Long tenantId);

    @Query("SELECT s FROM Session s WHERE s.tenantId = :tenantId "
            + "AND s.workDate >= :start AND s.workDate < :end")
    List<Session> findByMonth(
            @Param("tenantId") Long tenantId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    @Query("SELECT s FROM Session s WHERE s.tenantId = :tenantId AND s.userId = :userId "
            + "AND s.workDate >= :start AND s.workDate < :end")
    List<Session> findByUserAndMonth(
            @Param("tenantId") Long tenantId,
            @Param("userId") Long userId,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    @Query("SELECT s FROM Session s WHERE s.tenantId = :tenantId "
            + "AND s.workDate >= :from AND s.workDate <= :to")
    List<Session> findByTenantIdAndWorkDateBetween(
            @Param("tenantId") Long tenantId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
