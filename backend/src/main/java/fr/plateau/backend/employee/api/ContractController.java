package fr.plateau.backend.employee.api;

import java.time.LocalDate;
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
import fr.plateau.backend.employee.data.Contract;
import fr.plateau.backend.employee.domain.ContractService;

@RestController
@RequestMapping("/api/employees")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @PostMapping("/{id}/contract")
    @ResponseStatus(HttpStatus.CREATED)
    public ContractCreatedResponse createContract(
            @PathVariable Long id,
            @RequestBody ContractRequest request
    ) {
        requireOwnerOrManager();

        ContractService.ContractOutcome outcome = contractService.createContractWithWarnings(
                id,
                SecurityUtils.getCurrentTenantId(),
                request.type(),
                request.weeklyMinutes(),
                request.hourlyWageCents(),
                request.startDate(),
                request.endDate()
        );

        return new ContractCreatedResponse(outcome.contract(), outcome.warnings());
    }

    @GetMapping("/{id}/contracts")
    public List<Contract> getContractHistory(@PathVariable Long id) {
        requireOwnerOrManager();

        return contractService.getContractHistory(
                id,
                SecurityUtils.getCurrentTenantId()
        );
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException(
                    "Only OWNER or MANAGER can manage employee contracts"
            );
        }
    }

    public record ContractRequest(
            String type,
            Integer weeklyMinutes,
            Integer hourlyWageCents,
            LocalDate startDate,
            LocalDate endDate
    ) {
    }
}