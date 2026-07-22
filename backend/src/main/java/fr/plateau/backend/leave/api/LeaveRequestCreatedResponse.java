package fr.plateau.backend.leave.api;

import fr.plateau.backend.leave.data.LeaveRequest;

public record LeaveRequestCreatedResponse(LeaveRequest request, boolean hasScheduledShifts) {
}
