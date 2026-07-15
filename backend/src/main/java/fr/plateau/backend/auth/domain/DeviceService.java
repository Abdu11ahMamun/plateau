package fr.plateau.backend.auth.domain;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.auth.data.Device;
import fr.plateau.backend.auth.data.DeviceRepository;
import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.employee.data.EmployeeRepository;

@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final EmployeeRepository employeeRepository;

    public DeviceService(DeviceRepository deviceRepository, EmployeeRepository employeeRepository) {
        this.deviceRepository = deviceRepository;
        this.employeeRepository = employeeRepository;
    }

    @Transactional
    public Device enrollDevice(Long userId, String installId, String publicKey, String platform) {
        List<Device> activeDevices = deviceRepository.findByUserIdAndStatus(userId, DeviceStatus.ACTIVE);
        if (!activeDevices.isEmpty()) {
            throw new ConflictException("Device already enrolled. Revoke existing device first.");
        }

        Device device = new Device(userId, installId, platform, publicKey, DeviceAttestation.DEV_BYPASS, DeviceStatus.ACTIVE);
        return deviceRepository.save(device);
    }

    @Transactional
    public void revokeDevice(Long deviceId, Long callerUserId, String callerRole, Long callerTenantId) {
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new NotFoundException("Device " + deviceId + " not found"));

        boolean isSelf = device.getUserId().equals(callerUserId);
        if (!isSelf) {
            boolean isOwnerOrManager = "OWNER".equals(callerRole) || "MANAGER".equals(callerRole);
            // Owner/manager may revoke any device, but only for a user in their own tenant.
            boolean sameTenant = isOwnerOrManager && employeeRepository.findById(device.getUserId())
                    .map(employee -> callerTenantId.equals(employee.getTenantId()))
                    .orElse(false);

            if (!sameTenant) {
                throw new ForbiddenException("Not authorized to revoke this device");
            }
        }

        device.setStatus(DeviceStatus.REVOKED);
        device.setRevokedAt(Instant.now());
    }

    @Transactional(readOnly = true)
    public List<Device> listMyDevices(Long userId) {
        return deviceRepository.findByUserId(userId);
    }
}
