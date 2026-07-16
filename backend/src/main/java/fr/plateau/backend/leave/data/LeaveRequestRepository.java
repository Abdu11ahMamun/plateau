package fr.plateau.backend.leave.data;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import fr.plateau.backend.leave.domain.LeaveStatus;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {

    List<LeaveRequest> findByTenantId(Long tenantId);

    List<LeaveRequest> findByTenantIdAndUserId(Long tenantId, Long userId);

    List<LeaveRequest> findByTenantIdAndStatus(Long tenantId, LeaveStatus status);

    @Query("SELECT lr FROM LeaveRequest lr WHERE lr.tenantId = :tenantId "
            + "AND lr.startDate <= :to AND lr.endDate >= :from")
    List<LeaveRequest> findByTenantIdAndDateRangeOverlap(
            @Param("tenantId") Long tenantId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to);
}
