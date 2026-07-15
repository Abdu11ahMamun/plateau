package fr.plateau.backend.employee.api;

import fr.plateau.backend.employee.domain.Role;

public record UpdateEmployeeRequest(String name, String email, Role role) {
}
