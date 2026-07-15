package fr.plateau.backend.employee.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.employee.data.Contract;
import fr.plateau.backend.employee.domain.ContractService;

/// The signed-in employee's own current contract. Any authenticated role.
@RestController
@RequestMapping("/api/me/contract")
public class MeContractController {

    private final ContractService contractService;

    public MeContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public EmployeeView.CurrentContractView myContract() {
        Long userId = SecurityUtils.getCurrentUserId();
        Long tenantId = SecurityUtils.getCurrentTenantId();

        Contract contract = contractService.getCurrentContract(userId, tenantId)
                .orElseThrow(() -> new NotFoundException("No active contract"));

        return new EmployeeView.CurrentContractView(
                contract.getType(),
                contract.getWeeklyMinutes(),
                contract.getHourlyWageCents(),
                contract.getStartDate());
    }
}
