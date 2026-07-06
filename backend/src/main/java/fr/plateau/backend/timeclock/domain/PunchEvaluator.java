package fr.plateau.backend.timeclock.domain;

public class PunchEvaluator {

    private PunchEvaluator() {
    }

    public static PunchResult evaluate(String method, boolean hasOpenSession) {
        byte trust = switch (method) {
            case "NFC" -> (byte) 75;
            case "MANUAL" -> (byte) 15;
            default -> (byte) 0;
        };

        String type = hasOpenSession ? "OUT" : "IN";

        String status = trust >= 40 ? "AUTO" : "FLAGGED";
        String flag = method.equals("MANUAL") ? "MANUAL_METHOD" : null;

        return new PunchResult(type, trust, status, flag);
    }
}
