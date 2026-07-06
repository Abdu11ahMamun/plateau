## 2026-07-06 · M1: OTP Auth + JWT
- OTP delivery abstraction: ConsoleOtpSender (dev) / EmailOtpSender (prod)
- identifier column (not phone) — works for email+phone without schema change
- Bugs fixed: wrong UsernamePasswordAuthenticationFilter import; 
  otp_codes.attempts TINYINT → Java byte
- Verified: happy path, lockout (429 on 5th attempt), no-token 401
- Next: device enroll (simplified, no Play Integrity yet)