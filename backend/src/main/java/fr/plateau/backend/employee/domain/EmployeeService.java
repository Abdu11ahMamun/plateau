package fr.plateau.backend.employee.domain;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.auth.data.Device;
import fr.plateau.backend.auth.data.DeviceRepository;
import fr.plateau.backend.auth.domain.DeviceStatus;
import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.common.UnprocessableEntityException;
import fr.plateau.backend.employee.api.EmployeeView;
import fr.plateau.backend.employee.data.Contract;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;

@Service
public class EmployeeService {

    private static final Logger log =
            LoggerFactory.getLogger(EmployeeService.class);

    private final EmployeeRepository employeeRepository;
    private final DeviceRepository deviceRepository;
    private final ContractService contractService;

    public EmployeeService(
            EmployeeRepository employeeRepository,
            DeviceRepository deviceRepository,
            ContractService contractService
    ) {
        this.employeeRepository = employeeRepository;
        this.deviceRepository = deviceRepository;
        this.contractService = contractService;
    }

    @Transactional(readOnly = true)
    public List<EmployeeView> listEmployees(Long tenantId) {
        List<Employee> employees =
                employeeRepository.findAllByTenantId(tenantId);

        if (employees.isEmpty()) {
            return List.of();
        }

        List<Long> ids = employees.stream()
                .map(Employee::getId)
                .toList();

        // Last active device wins if an employee somehow has more than one.
        Map<Long, Device> activeByUser = deviceRepository
                .findByUserIdInAndStatus(ids, DeviceStatus.ACTIVE)
                .stream()
                .collect(Collectors.toMap(
                        Device::getUserId,
                        Function.identity(),
                        (a, b) -> b
                ));

        return employees.stream()
                .map(employee -> {
                    Contract currentContract = contractService
                            .getCurrentContract(
                                    employee.getId(),
                                    tenantId
                            )
                            .orElse(null);

                    return toView(
                            employee,
                            activeByUser.get(employee.getId()),
                            currentContract
                    );
                })
                .toList();
    }

    @Transactional
    public EmployeeView createEmployee(
            Long tenantId,
            String name,
            String phone,
            String email,
            Role role
    ) {
        String normalizedPhone =
                phone == null || phone.isBlank()
                        ? null
                        : phone.trim();

        Employee employee = new Employee(
                tenantId,
                name,
                normalizedPhone,
                email,
                role,
                EmployeeStatus.INVITED
        );

        try {
            Employee saved = employeeRepository.saveAndFlush(employee);

            log.info(
                    "=== PLATEAU INVITE === To: {} Name: {} Role: {} ===",
                    email,
                    name,
                    role
            );

            return toView(saved, null, null);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    "An employee with this phone or email already exists"
            );
        }
    }

    @Transactional
    public EmployeeView updateEmployee(
            Long id,
            Long tenantId,
            String name,
            String email,
            Role role
    ) {
        Employee employee = employeeRepository.findById(id)
                .filter(e -> tenantId.equals(e.getTenantId()))
                .orElseThrow(() ->
                        new NotFoundException(
                                "Employee " + id + " not found"
                        )
                );

        if (role != null && employee.getRole() == Role.OWNER && role != Role.OWNER) {
            long activeOwners = employeeRepository.findAllByTenantId(tenantId).stream()
                    .filter(e -> e.getRole() == Role.OWNER && e.getStatus() == EmployeeStatus.ACTIVE)
                    .count();

            if (activeOwners <= 1) {
                throw new UnprocessableEntityException(
                        "Tenant must keep at least one owner"
                );
            }
        }

        if (name != null) {
            employee.setName(name);
        }
        if (email != null) {
            employee.setEmail(email);
        }
        if (role != null) {
            employee.setRole(role);
        }

        try {
            Employee saved = employeeRepository.saveAndFlush(employee);

            log.info(
                    "EMPLOYEE UPDATED id={} tenantId={} by={}",
                    saved.getId(),
                    tenantId,
                    SecurityUtils.getCurrentUserId()
            );

            Device activeDevice = deviceRepository
                    .findByUserIdAndStatus(saved.getId(), DeviceStatus.ACTIVE)
                    .stream()
                    .findFirst()
                    .orElse(null);

            Contract currentContract = contractService
                    .getCurrentContract(saved.getId(), tenantId)
                    .orElse(null);

            return toView(saved, activeDevice, currentContract);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException(
                    "An employee with this phone or email already exists"
            );
        }
    }

    @Transactional
    public void resendInvite(Long id, Long tenantId) {
        Employee employee = employeeRepository.findById(id)
                .filter(e -> tenantId.equals(e.getTenantId()))
                .orElseThrow(() ->
                        new NotFoundException(
                                "Employee " + id + " not found"
                        )
                );

        if (employee.getStatus() != EmployeeStatus.INVITED) {
            throw new ConflictException("Employee has already joined");
        }

        log.info(
                "=== PLATEAU INVITE === To: {} Name: {} Role: {} ===",
                employee.getEmail(),
                employee.getName(),
                employee.getRole()
        );
    }

    @Transactional
    public void archiveEmployee(Long id, Long tenantId) {
        Employee employee = employeeRepository.findById(id)
                .filter(e -> tenantId.equals(e.getTenantId()))
                .orElseThrow(() ->
                        new NotFoundException(
                                "Employee " + id + " not found"
                        )
                );

        employee.setStatus(EmployeeStatus.ARCHIVED);
    }

    private EmployeeView toView(
            Employee employee,
            Device activeDevice,
            Contract currentContract
    ) {
        boolean enrolled = activeDevice != null;

        EmployeeView.CurrentContractView currentContractView =
                currentContract == null
                        ? null
                        : new EmployeeView.CurrentContractView(
                        currentContract.getType(),
                        currentContract.getWeeklyMinutes(),
                        currentContract.getHourlyWageCents(),
                        currentContract.getStartDate()
                );

        return new EmployeeView(
                employee.getId(),
                employee.getName(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getRole().name(),
                employee.getStatus().name(),
                enrolled ? "ACTIVE" : "NONE",
                enrolled ? activeDevice.getId() : null,
                enrolled ? activeDevice.getPlatform() : null,
                enrolled ? activeDevice.getEnrolledAt() : null,
                currentContractView,
                employee.getCreatedAt()
        );
    }
}