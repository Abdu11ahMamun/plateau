package fr.plateau.backend.timeclock.api;

import java.time.LocalTime;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.timeclock.data.SessionCorrection;
import fr.plateau.backend.timeclock.domain.CorrectionService;

@RestController
@RequestMapping("/api/admin/sessions")
public class SessionCorrectionController {

    private final CorrectionService correctionService;

    public SessionCorrectionController(CorrectionService correctionService) {
        this.correctionService = correctionService;
    }

    @PostMapping("/{sessionId}/correct")
    @ResponseStatus(HttpStatus.CREATED)
    public SessionCorrection correct(@PathVariable Long sessionId, @RequestBody CorrectionRequest request) {
        requireOwnerOrManager();

        return correctionService.createCorrection(
                SecurityUtils.getCurrentTenantId(),
                sessionId,
                SecurityUtils.getCurrentUserId(),
                request.clockIn(),
                request.clockOut(),
                request.reason()
        );
    }

    @GetMapping("/{sessionId}/corrections")
    public List<SessionCorrection> history(@PathVariable Long sessionId) {
        requireOwnerOrManager();

        return correctionService.getCorrectionHistory(SecurityUtils.getCurrentTenantId(), sessionId);
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Only OWNER or MANAGER can correct sessions");
        }
    }

    public record CorrectionRequest(LocalTime clockIn, LocalTime clockOut, String reason) {
    }
}
