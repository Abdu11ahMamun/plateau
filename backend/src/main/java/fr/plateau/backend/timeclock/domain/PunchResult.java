package fr.plateau.backend.timeclock.domain;

public record PunchResult(
        String type,          // "IN" or "OUT"
        byte trustScore,
        String sessionStatus, // "AUTO" or "FLAGGED"
        String flagReason     // null, or "MANUAL_METHOD"
) {
}
