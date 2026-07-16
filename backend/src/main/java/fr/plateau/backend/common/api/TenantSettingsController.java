package fr.plateau.backend.common.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.TenantSettingsService;
import fr.plateau.backend.common.UnprocessableEntityException;

@RestController
@RequestMapping("/api/admin/settings")
public class TenantSettingsController {

    private final TenantSettingsService tenantSettingsService;

    public TenantSettingsController(TenantSettingsService tenantSettingsService) {
        this.tenantSettingsService = tenantSettingsService;
    }

    @GetMapping("/break-default")
    public BreakDefaultResponse getBreakDefault() {
        requireOwnerOrManager();

        int minutes = tenantSettingsService.getIntSetting(
                SecurityUtils.getCurrentTenantId(), TenantSettingsService.DEFAULT_BREAK_MINUTES_KEY, 20);
        return new BreakDefaultResponse(minutes);
    }

    @PutMapping("/break-default")
    public BreakDefaultResponse setBreakDefault(@RequestBody BreakDefaultRequest request) {
        requireOwner();

        if (request.minutes() < 0 || request.minutes() > 120) {
            throw new UnprocessableEntityException("minutes must be between 0 and 120");
        }

        tenantSettingsService.setSetting(
                SecurityUtils.getCurrentTenantId(),
                TenantSettingsService.DEFAULT_BREAK_MINUTES_KEY,
                String.valueOf(request.minutes()));

        return new BreakDefaultResponse(request.minutes());
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();
        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Only OWNER or MANAGER can view settings");
        }
    }

    private void requireOwner() {
        if (!"OWNER".equals(SecurityUtils.getCurrentRole())) {
            throw new ForbiddenException("Only OWNER can change this setting");
        }
    }

    public record BreakDefaultRequest(int minutes) {
    }

    public record BreakDefaultResponse(int minutes) {
    }
}
