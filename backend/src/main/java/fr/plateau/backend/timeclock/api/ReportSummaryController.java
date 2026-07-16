package fr.plateau.backend.timeclock.api;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.timeclock.domain.ReportSummaryService;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportSummaryController {

    private static final long MAX_RANGE_DAYS = 366;

    private final ReportSummaryService reportSummaryService;

    public ReportSummaryController(ReportSummaryService reportSummaryService) {
        this.reportSummaryService = reportSummaryService;
    }

    @GetMapping("/summary")
    public List<ReportSummaryService.EmployeeMonthlySummary> summary(
            @RequestParam("from") String fromParam,
            @RequestParam("to") String toParam
    ) {
        String role = SecurityUtils.getCurrentRole();
        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Requires OWNER or MANAGER role");
        }

        LocalDate from;
        LocalDate to;
        try {
            from = LocalDate.parse(fromParam); // expects "YYYY-MM-DD"
            to = LocalDate.parse(toParam);
        } catch (Exception e) {
            throw new UnprocessableEntityException("from and to must be valid ISO dates (YYYY-MM-DD)");
        }

        if (from.isAfter(to)) {
            throw new UnprocessableEntityException("from date must be before or equal to to date");
        }

        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new UnprocessableEntityException("date range cannot exceed 1 year");
        }

        Long tenantId = SecurityUtils.getCurrentTenantId();
        return reportSummaryService.getSummary(tenantId, from, to);
    }
}
