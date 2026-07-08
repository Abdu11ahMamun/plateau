package fr.plateau.backend.employee.api;

import fr.plateau.backend.employee.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateEmployeeRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 20) String phone,
        @NotBlank @Email @Size(max = 255) String email,
        @NotNull Role role) {
}
