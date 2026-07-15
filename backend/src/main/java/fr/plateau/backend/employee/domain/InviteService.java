package fr.plateau.backend.employee.domain;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.auth.domain.DeviceService;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;
import fr.plateau.backend.tenant.data.Tenant;
import fr.plateau.backend.tenant.data.TenantRepository;

@Service
public class InviteService {

    private final EmployeeRepository employeeRepository;
    private final TenantRepository tenantRepository;
    private final DeviceService deviceService;

    public InviteService(
            EmployeeRepository employeeRepository,
            TenantRepository tenantRepository,
            DeviceService deviceService
    ) {
        this.employeeRepository = employeeRepository;
        this.tenantRepository = tenantRepository;
        this.deviceService = deviceService;
    }

    @Transactional(readOnly = true)
    public TenantStatusView getMyTenant(Long userId, Long tenantId) {
        Employee employee = findEmployee(userId, tenantId);
        return new TenantStatusView(tenantName(tenantId), employee.getName(), employee.getStatus().name());
    }

    @Transactional
    public TenantStatusView acceptInvite(
            Long userId,
            Long tenantId,
            String installId,
            String publicKey,
            String platform
    ) {
        Employee employee = findEmployee(userId, tenantId);

        if (employee.getStatus() == EmployeeStatus.INVITED) {
            employee.setStatus(EmployeeStatus.ACTIVE);
        }

        // Reuses DeviceService's existing enroll logic as-is (including its
        // same-user/same-device idempotency handling) rather than duplicating it here.
        deviceService.enrollDevice(userId, installId, publicKey, platform);

        return new TenantStatusView(tenantName(tenantId), employee.getName(), employee.getStatus().name());
    }

    private Employee findEmployee(Long userId, Long tenantId) {
        return employeeRepository.findById(userId)
                .filter(e -> tenantId.equals(e.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Employee not found"));
    }

    private String tenantName(Long tenantId) {
        return tenantRepository.findById(tenantId)
                .map(Tenant::getName)
                .orElse("Unknown");
    }

    public record TenantStatusView(String tenantName, String employeeName, String status) {
    }
}
