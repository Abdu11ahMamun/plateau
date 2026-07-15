package fr.plateau.backend.employee.api;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.employee.domain.EmployeeService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {

    private final EmployeeService employeeService;

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    @GetMapping
    public List<EmployeeView> list() {
        return employeeService.listEmployees();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EmployeeView create(@Valid @RequestBody CreateEmployeeRequest request) {
        return employeeService.createEmployee(request.name(), request.phone(), request.email(), request.role());
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archive(@PathVariable Long id) {
        employeeService.archiveEmployee(id);
    }

    @PutMapping("/{id}")
    public EmployeeView update(@PathVariable Long id, @RequestBody UpdateEmployeeRequest request) {
        requireOwnerOrManager();

        return employeeService.updateEmployee(
                id,
                SecurityUtils.getCurrentTenantId(),
                request.name(),
                request.email(),
                request.role()
        );
    }

    @PostMapping("/{id}/resend-invite")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resendInvite(@PathVariable Long id) {
        requireOwnerOrManager();

        employeeService.resendInvite(id, SecurityUtils.getCurrentTenantId());
    }

    private void requireOwnerOrManager() {
        String role = SecurityUtils.getCurrentRole();

        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException(
                    "Only OWNER or MANAGER can manage employees"
            );
        }
    }
}
