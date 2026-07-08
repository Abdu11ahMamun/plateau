package fr.plateau.backend.employee.api;

import java.time.Instant;

/**
 * Employee row for the admin panel. Flattens the user record and folds in the
 * employee's active device (if any) so the panel can show enrollment status
 * without a second call.
 *
 * <p>{@code deviceStatus} is {@code "ACTIVE"} when the employee has an active
 * device (then {@code devicePlatform}/{@code enrolledAt} are populated), or
 * {@code "NONE"} when they have never enrolled.
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
        Instant createdAt) {
}
