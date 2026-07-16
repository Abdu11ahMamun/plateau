package fr.plateau.backend.leave.data;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {

    List<LeaveType> findByTenantId(Long tenantId);
}
