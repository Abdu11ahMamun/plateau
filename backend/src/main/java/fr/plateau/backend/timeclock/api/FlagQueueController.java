package fr.plateau.backend.timeclock.api;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.timeclock.data.SessionFlagResolution;
import fr.plateau.backend.timeclock.domain.FlagQueueService;

@RestController
@RequestMapping("/api/admin/flags")
public class FlagQueueController {

    private final FlagQueueService flagQueueService;

    public FlagQueueController(FlagQueueService flagQueueService) {
        this.flagQueueService = flagQueueService;
    }

    @GetMapping
    public List<FlagQueueService.FlaggedSessionView> list(
            @RequestParam(value = "resolved", required = false) Boolean resolved
    ) {
        requireOwnerOrManager();

        return flagQueueService.getFlaggedSessions(SecurityUtils.getCurrentTenantId(), resolved);
    }

    @PostMapping("/{sessionId}/resolve")
    public SessionFlagResolution resolve(@PathVariable Long sessionId, @RequestBody ResolveRequest request) {
        requireOwnerOrManager();

        return flagQueueService.resolveFlagged(
                SecurityUtils.getCurrentTenantId(),
                sessionId,
                SecurityUtils.getCurrentUserId(),
                request.resolution(),
                request.note()
        );
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Only OWNER or MANAGER can manage flagged sessions");
        }
    }

    public record ResolveRequest(String resolution, String note) {
    }
}
