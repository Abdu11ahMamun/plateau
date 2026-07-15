package fr.plateau.backend.auth.api;

import java.time.Instant;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.auth.data.Device;
import fr.plateau.backend.auth.domain.DeviceService;
import fr.plateau.backend.common.SecurityUtils;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    private final DeviceService deviceService;

    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @PostMapping("/enroll")
    @ResponseStatus(HttpStatus.CREATED)
    public EnrollResponse enroll(@Valid @RequestBody EnrollRequest request) {
        Long userId = SecurityUtils.getCurrentUserId();
        Device device = deviceService.enrollDevice(userId, request.installId(), request.publicKey(), request.platform());
        return new EnrollResponse(device.getId(), device.getInstallId(), device.getStatus().name());
    }

    @PostMapping("/{deviceId}/revoke")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable Long deviceId) {
        Long callerUserId = SecurityUtils.getCurrentUserId();
        String callerRole = SecurityUtils.getCurrentRole();
        Long callerTenantId = SecurityUtils.getCurrentTenantId();
        deviceService.revokeDevice(deviceId, callerUserId, callerRole, callerTenantId);
    }

    @GetMapping("/me")
    public List<DeviceSummary> myDevices() {
        Long userId = SecurityUtils.getCurrentUserId();
        return deviceService.listMyDevices(userId).stream()
                .map(d -> new DeviceSummary(d.getId(), d.getInstallId(), d.getPlatform(), d.getStatus().name(), d.getEnrolledAt()))
                .toList();
    }

    public record EnrollRequest(
            @NotBlank String installId,
            @NotBlank String publicKey,
            @NotBlank String platform) {
    }

    public record EnrollResponse(Long deviceId, String installId, String status) {
    }

    public record DeviceSummary(Long deviceId, String installId, String platform, String status, Instant enrolledAt) {
    }
}
