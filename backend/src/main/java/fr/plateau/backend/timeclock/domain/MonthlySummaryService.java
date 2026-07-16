package fr.plateau.backend.timeclock.domain;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.employee.data.Contract;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;
import fr.plateau.backend.employee.domain.ContractService;
import fr.plateau.backend.employee.domain.EmployeeStatus;
import fr.plateau.backend.timeclock.data.Session;
import fr.plateau.backend.timeclock.data.SessionRepository;

@Service
public class MonthlySummaryService {

    // Average weeks per month (365.25 / 12 / 7), used only for this
    // simplified monthly-average threshold.
    private static final double AVERAGE_WEEKS_PER_MONTH = 4.345;

    private final SessionRepository sessionRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractService contractService;

    public MonthlySummaryService(
            SessionRepository sessionRepository,
            EmployeeRepository employeeRepository,
            ContractService contractService
    ) {
        this.sessionRepository = sessionRepository;
        this.employeeRepository = employeeRepository;
        this.contractService = contractService;
    }

    @Transactional(readOnly = true)
    public List<EmployeeMonthlySummary> getMonthlySummary(Long tenantId, YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.plusMonths(1).atDay(1);

        // Reuses the same query that powers GET /api/admin/attendance,
        // grouped in-memory instead of issuing one query per employee.
        Map<Long, List<Session>> sessionsByUser = sessionRepository.findByMonth(tenantId, start, end).stream()
                .collect(Collectors.groupingBy(Session::getUserId));

        List<Employee> activeEmployees = employeeRepository.findAllByTenantId(tenantId).stream()
                .filter(employee -> employee.getStatus() == EmployeeStatus.ACTIVE)
                .toList();

        return activeEmployees.stream()
                .map(employee -> summarize(
                        employee,
                        sessionsByUser.getOrDefault(employee.getId(), List.of()),
                        tenantId))
                .toList();
    }

    private EmployeeMonthlySummary summarize(Employee employee, List<Session> sessions, Long tenantId) {
        int totalMinutes = sessions.stream()
                .map(Session::getMinutesTotal)
                .filter(Objects::nonNull)
                .mapToInt(Integer::intValue)
                .sum();

        int flaggedCount = (int) sessions.stream()
                .filter(session -> session.getStatus() != SessionStatus.AUTO)
                .count();

        Optional<Contract> contract = contractService.getCurrentContract(employee.getId(), tenantId);

        int normalMinutes;
        int overtimeMinutes;
        if (contract.isPresent()) {
            // SIMPLIFIED: monthly-average threshold, not per-week HCR
            // complémentaires calc. Revisit before real payroll use.
            int monthlyContractMinutes = Math.round(contract.get().getWeeklyMinutes() * (float) AVERAGE_WEEKS_PER_MONTH);
            normalMinutes = Math.min(totalMinutes, monthlyContractMinutes);
            overtimeMinutes = Math.max(0, totalMinutes - monthlyContractMinutes);
        } else {
            normalMinutes = totalMinutes;
            overtimeMinutes = 0;
        }

        return new EmployeeMonthlySummary(
                employee.getId(),
                employee.getName(),
                totalMinutes,
                normalMinutes,
                overtimeMinutes,
                flaggedCount,
                contract.isPresent());
    }

    public record EmployeeMonthlySummary(
            Long employeeId,
            String name,
            int totalMinutes,
            int normalMinutes,
            int overtimeMinutes,
            int flaggedCount,
            boolean hasContract) {
    }
}
