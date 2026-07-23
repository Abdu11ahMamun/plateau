package fr.plateau.backend.timeclock.domain;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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
public class ReportSummaryService {

    private final SessionRepository sessionRepository;
    private final EmployeeRepository employeeRepository;
    private final ContractService contractService;
    private final CorrectionService correctionService;

    public ReportSummaryService(
            SessionRepository sessionRepository,
            EmployeeRepository employeeRepository,
            ContractService contractService,
            CorrectionService correctionService
    ) {
        this.sessionRepository = sessionRepository;
        this.employeeRepository = employeeRepository;
        this.contractService = contractService;
        this.correctionService = correctionService;
    }

    @Transactional(readOnly = true)
    public List<EmployeeMonthlySummary> getSummary(Long tenantId, LocalDate from, LocalDate to) {
        // Reuses the same query shape that powers GET /api/admin/attendance,
        // grouped in-memory instead of issuing one query per employee.
        Map<Long, List<Session>> sessionsByUser = sessionRepository
                .findByTenantIdAndWorkDateBetween(tenantId, from, to).stream()
                .collect(Collectors.groupingBy(Session::getUserId));

        List<Employee> activeEmployees = employeeRepository.findAllByTenantId(tenantId).stream()
                .filter(employee -> employee.getStatus() == EmployeeStatus.ACTIVE)
                .toList();

        long daysInRange = ChronoUnit.DAYS.between(from, to) + 1;

        return activeEmployees.stream()
                .map(employee -> summarize(
                        employee,
                        sessionsByUser.getOrDefault(employee.getId(), List.of()),
                        tenantId,
                        daysInRange))
                .toList();
    }

    private EmployeeMonthlySummary summarize(Employee employee, List<Session> sessions, Long tenantId, long daysInRange) {
        // Corrected duration when a correction exists, since payroll must
        // reflect the actual hours worked, not the original punch data.
        int totalMinutes = sessions.stream()
                .map(session -> correctionService.resolveEffectiveMinutes(tenantId, session))
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
            // SIMPLIFIED: prorated-by-days threshold (weeklyMinutes * days/7),
            // not real per-week HCR complémentaires calc. Revisit before real
            // payroll use.
            int contractMinutesForRange = Math.round(contract.get().getWeeklyMinutes() * (float) (daysInRange / 7.0));
            normalMinutes = Math.min(totalMinutes, contractMinutesForRange);
            overtimeMinutes = Math.max(0, totalMinutes - contractMinutesForRange);
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
