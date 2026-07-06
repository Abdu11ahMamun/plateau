## 2026-07-06 · M1: OTP Auth + JWT
- OTP delivery abstraction: ConsoleOtpSender (dev) / EmailOtpSender (prod)
- identifier column (not phone) — works for email+phone without schema change
- Bugs fixed: wrong UsernamePasswordAuthenticationFilter import; 
  otp_codes.attempts TINYINT → Java byte
- Verified: happy path, lockout (429 on 5th attempt), no-token 401
- Next: device enroll (simplified, no Play Integrity yet)


## 2026-07-06 · Device Enrollment
- DEV_BYPASS mode only, Play Integrity Phase 2
- Bugs: @Lob needs length=65535 for TEXT; 
  Hibernate 6 enum param must match type exactly
- SecurityUtils added for JWT context reads
- Next: punch endpoint

## 2026-07-06 · Punch + Live Board
- PunchEvaluator: pure class, zero Spring annotations
- time_events: append-only verified (OUT only touches sessions row)
- trust scores: NFC=75, MANUAL=15 — MANUAL always FLAGGED
- Added: UnprocessableEntityException(422), ForbiddenException(403)
- TODO: JUnit test for PunchEvaluator (money-path, no Docker needed)
- Next: Flutter app