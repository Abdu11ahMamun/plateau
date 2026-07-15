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



## 2026-07-15 · Batch 1: Contract Management — DONE (with QA loop)
- Contract CRUD, auto-close on new contract, history, tenant-scoped
- Role-gated (OWNER/MANAGER) via SecurityUtils
- Bug caught by QA: SMIC warning was in session summary but not in code
  → fixed via ContractOutcome pattern (matches PunchOutcome/TokenPair)
- QA verified via DB row inspection, not just status codes (auto-close,
  tenant scoping, role enforcement all confirmed at data level)
- Postman collection: postman/contract-management.json
- QA report: qa/reports/contract-management-2026-07-15.md (+ retest)
- Lesson: agent session summaries claiming "done" get QA-verified before
  trusting them — this is now standard practice for every batch


  ## 2026-07-15 · Batch 1: Contract Management — CLOSED
- Retest 12/12 pass (was 10/12, SMIC envelope fixed)
- Known debt (non-blocking): SMIC_HOURLY_CENTS hardcoded, needs
  legal_rates table with effective dates (SMIC changes twice/year)


  ## 2026-07-15 · Batch 2 T5: Contracts API client
- Contract, CreateContractInput types added to types/api.types.ts
- Employee.currentContract synced with backend's CurrentContractView
- createContract() returns {contract, warnings} wrapped
- getContracts() returns plain Contract[] — asymmetry preserved correctly


## 2026-07-15 · Batch 2 T7: Contract card + Add Contract modal
- Full-width contract card, lazy-loaded History (fetch on first expand)
- Hours→minutes (×60), euros→cents (×100+round) conversion at submit
- Dual toast verified: success + SMIC warning show together, don't suppress
- Reused Field/inputClass/ROLE_STYLES/DeviceStatusDisplay — no duplication
- Note: "Add contract" button text collision (trigger vs submit) — 
  disambiguate by type attr if writing tests later



  ## 2026-07-15 · Batch 2 T8: This-month punch summary — DONE
- Reused getAttendance() + shared query key with AttendancePage (cache hit)
- MethodBadge extracted, single source of truth for badge rendering
- row.flagged (backend field) reused for chip count, not re-derived
- Cross-verified chip counts against AttendancePage's own pagination footer
- ?q= param wired for "View all in Attendance" deep-link

## 2026-07-15 · Batch 2 QA — CLOSED 11/11
- All checks pass, 0 blockers
- Note (verification tooling, not product): QA's own script initially
  misread attendance table columns due to responsive breakpoint shift
  — self-caught, corrected, confirmed exact match on retest
- Note: "View all in Attendance" link only shows when employee has
  >10 sessions this month (RECENT_LIMIT=10) — expected by design