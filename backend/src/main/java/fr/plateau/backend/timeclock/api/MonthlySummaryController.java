package fr.plateau.backend.timeclock.api;

import java.time.YearMonth;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.timeclock.domain.MonthlySummaryService;

@RestController
@RequestMapping("/api/admin/reports")
public class MonthlySummaryController {

    private final MonthlySummaryService monthlySummaryService;

    public MonthlySummaryController(MonthlySummaryService monthlySummaryService) {
        this.monthlySummaryService = monthlySummaryService;
    }

    @GetMapping("/monthly-summary")
    public List<MonthlySummaryService.EmployeeMonthlySummary> monthlySummary(@RequestParam("month") String month) {
        String role = SecurityUtils.getCurrentRole();
        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Requires OWNER or MANAGER role");
        }

        YearMonth ym;
        try {
            ym = YearMonth.parse(month); // expects "YYYY-MM"
        } catch (Exception e) {
            throw new UnprocessableEntityException("month must be YYYY-MM");
        }

        Long tenantId = SecurityUtils.getCurrentTenantId();
        return monthlySummaryService.getMonthlySummary(tenantId, ym);
    }
}
