package fr.plateau.backend.timeclock.api;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.plateau.backend.common.ForbiddenException;
import fr.plateau.backend.common.SecurityUtils;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;
import fr.plateau.backend.timeclock.data.SessionRepository;
import fr.plateau.backend.timeclock.data.TimeEventRepository;

@RestController
@RequestMapping("/api/admin/live")
public class LiveBoardController {

    private final SessionRepository sessionRepository;
    private final TimeEventRepository timeEventRepository;
    private final EmployeeRepository employeeRepository;

    public LiveBoardController(SessionRepository sessionRepository, TimeEventRepository timeEventRepository,
            EmployeeRepository employeeRepository) {
        this.sessionRepository = sessionRepository;
        this.timeEventRepository = timeEventRepository;
        this.employeeRepository = employeeRepository;
    }

    @GetMapping
    public List<LiveEntry> live() {
        String role = SecurityUtils.getCurrentRole();
        if (!"OWNER".equals(role) && !"MANAGER".equals(role)) {
            throw new ForbiddenException("Requires OWNER or MANAGER role");
        }

        Long tenantId = SecurityUtils.getCurrentTenantId();
        Instant now = Instant.now();
        return sessionRepository.findOpenSessions(tenantId).stream()
                .map(session -> {
                    Instant clockedInAt = timeEventRepository.findById(session.getInEventId())
                            .map(event -> event.getEventTime())
                            .orElse(session.getCreatedAt());
                    Employee employee = employeeRepository.findById(session.getUserId()).orElse(null);
                    String name = employee != null ? employee.getName() : "Unknown";
                    String employeeRole = employee != null ? employee.getRole().name() : null;
                    long runningMinutes = Duration.between(clockedInAt, now).toMinutes();
                    return new LiveEntry(session.getUserId(), name, employeeRole, clockedInAt, runningMinutes);
                })
                .toList();
    }

    public record LiveEntry(Long userId, String name, String role, Instant clockedInAt, long runningMinutes) {
    }
}
