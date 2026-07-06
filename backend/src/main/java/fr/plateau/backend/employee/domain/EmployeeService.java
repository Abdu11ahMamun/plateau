package fr.plateau.backend.employee.domain;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.plateau.backend.common.ConflictException;
import fr.plateau.backend.common.NotFoundException;
import fr.plateau.backend.employee.data.Employee;
import fr.plateau.backend.employee.data.EmployeeRepository;

@Service
public class EmployeeService {

    private static final Long TENANT_ID = 1L;

    private final EmployeeRepository employeeRepository;

    public EmployeeService(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Transactional(readOnly = true)
    public List<Employee> listEmployees() {
        return employeeRepository.findAllByTenantId(TENANT_ID);
    }

    @Transactional
    public Employee createEmployee(String name, String phone, String email, Role role) {
        Employee employee = new Employee(TENANT_ID, name, phone, email, role, EmployeeStatus.INVITED);
        try {
            return employeeRepository.saveAndFlush(employee);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("An employee with this phone or email already exists");
        }
    }

    @Transactional
    public void archiveEmployee(Long id) {
        Employee employee = employeeRepository.findById(id)
                .filter(e -> TENANT_ID.equals(e.getTenantId()))
                .orElseThrow(() -> new NotFoundException("Employee " + id + " not found"));
        employee.setStatus(EmployeeStatus.ARCHIVED);
    }
}
