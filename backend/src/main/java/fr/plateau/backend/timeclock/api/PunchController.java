package fr.plateau.backend.timeclock.api;

import java.time.Instant;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.timeclock.domain.PunchMethod;
import fr.plateau.backend.timeclock.domain.PunchService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

@RestController
@RequestMapping("/api/punch")
public class PunchController {

    private final PunchService punchService;

    public PunchController(PunchService punchService) {
        this.punchService = punchService;
    }

    @PostMapping
    public PunchResponse punch(@Valid @RequestBody PunchRequest request) {
        if ("MANUAL".equals(request.method()) && (request.note() == null || request.note().isBlank())) {
            throw new UnprocessableEntityException("A note is required for manual punches");
        }

        PunchService.PunchOutcome outcome = punchService.punch(
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentTenantId(),
                PunchMethod.valueOf(request.method()),
                request.note());

        return new PunchResponse(outcome.type(), outcome.eventTime(), outcome.sessionMinutes());
    }

    public record PunchRequest(
            @NotNull @Pattern(regexp = "NFC|MANUAL", message = "must be NFC or MANUAL") String method,
            String note) {
    }

    public record PunchResponse(String type, Instant eventTime, Integer sessionMinutes) {
    }
}
