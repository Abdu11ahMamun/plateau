package fr.plateau.backend.employee.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.employee.domain.InviteService;

@RestController
public class InviteController {

    private final InviteService inviteService;

    public InviteController(InviteService inviteService) {
        this.inviteService = inviteService;
    }

    @GetMapping("/api/me/tenant")
    public InviteService.TenantStatusView myTenant() {
        return inviteService.getMyTenant(SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentTenantId());
    }

    @PostMapping("/api/invite/accept")
    public AcceptResponse accept(@RequestBody AcceptRequest request) {
        InviteService.TenantStatusView view = inviteService.acceptInvite(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentTenantId(),
                request.installId(),
                request.publicKey(),
                request.platform()
        );

        return new AcceptResponse(true, view.tenantName(), view.employeeName());
    }

    public record AcceptRequest(String installId, String publicKey, String platform) {
    }

    public record AcceptResponse(boolean accepted, String tenantName, String employeeName) {
    }
}
