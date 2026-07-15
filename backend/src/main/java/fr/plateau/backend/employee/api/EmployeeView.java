package fr.plateau.backend.employee.api;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Employee row for the admin panel. Flattens the user record and folds in the
 * employee's active device and current contract so the panel can display them
 * without additional API calls.
 *
 * <p>{@code deviceStatus} is {@code "ACTIVE"} when the employee has an active
 * device, or {@code "NONE"} when they have never enrolled.
 */
public record EmployeeView(
        Long id,
        String name,
        String email,
        String phone,
        String role,
        String status,
        String deviceStatus,
        String devicePlatform,
        Instant enrolledAt,
        CurrentContractView currentContract,
        Instant createdAt
) {

    public record CurrentContractView(
            String type,
            Integer weeklyMinutes,
            Integer hourlyWageCents,
            LocalDate startDate
    ) {
    }
}