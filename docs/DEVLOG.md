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


  ## 2026-07-15 · Batch 3 T9: Edit employee + resend invite — DONE
- PUT /api/employees/{id}: partial update, reuses uq_tenant_email
  constraint catch (not a pre-check) — same-email no-op handled free
- Last-owner protection: 422 if demoting the only ACTIVE owner
- Resend invite: reuses exact console log line from createEmployee
- Reused ContractController's requireOwnerOrManager() pattern
- 7/5 checks pass (5 required + audit log + 403 non-owner verified)

## 2026-07-15 · Batch 3 T10: Edit modal + resend invite (React) — DONE
- Edit modal: diffs against original prop, sends only changed fields
- No client-side last-owner logic — backend 422 shown verbatim (by design)
- Error messages read from err.response.data.detail, not guessed
- Invite banner: auto-hides via query invalidation if 409 race (already joined)
- Resend icon on EmployeesPage rows: stopPropagation pattern from T6 reused

## 2026-07-15 · Batch 3 T11: Device revoke — SECURITY FIX FOUND
- 🔴 Cross-tenant bug: revokeDevice had NO tenant check — any OWNER/MANAGER
  on ANY tenant could revoke ANY device on ANY other tenant. Device entity
  had no tenantId column; fixed via join through Employee.tenantId lookup.
- Also fixed: wrong status code (401→403) for forbidden-but-authenticated case
- Added deviceId to EmployeeView DTO (was missing — UI had no way to
  address a device at all before this)
- Curl-verified with 3 real accounts, not mocked
- Frontend: revoke button + window.confirm() + cache invalidation, verified
  list AND detail page both update (not just local state)
- Lesson: "confirm this already works" tasks still need the agent to
  actually verify, not assume — this one was silently broken


  ## 2026-07-15 · Batch 3 QA — CLOSED 12/13 (1 not-testable, 0 blockers)
- Full lifecycle verified in one continuous session: create→invite×3→
  edit→search/filter→archive→revoke, all correct
- Step 6 confirmed: failed submit doesn't lose form state (no unmount)
- Step 12 (403 cross-role) verified against DB, not just status code
- Step 13 (cross-tenant revoke) not testable — single tenant in dev DB.
  TODO before pilot: seed a 2nd tenant, re-run this specific check
  against DeviceService.revokeDevice's sameTenant path


  ## 2026-07-15 · Batch 4 T13: /api/me/hours + /api/me/contract — DONE
- /api/me/hours already existed (MeHoursController, undocumented) — verified
  matches spec, left untouched
- /api/me/contract added, reuses ContractService + EmployeeView's
  CurrentContractView DTO (no duplicate shape)
- Isolation verified numerically: admin shows 19/11/1 (Karim/Lea/Abdullah),
  Lea's own endpoint returns exactly her 11 — zero leakage

  ## 2026-07-15 · Batch 4 T15: /api/me/tenant + /api/invite/accept — DONE
- 🐛 Task premise was wrong: assumed enroll idempotency was already
  fixed (it wasn't — checked devlog, found no record, verified
  empirically: same installId 2nd call returned 409, not 200)
- Fixed in DeviceService.enrollDevice: short-circuit returns existing
  device on same-user-same-active-installId; different-device-active
  409 path untouched
- New tenant/ package (Tenant, TenantRepository) — minimal read-only,
  only id/name mapped, safe under ddl-auto=validate
- InviteService coordinates status transition + calls DeviceService
  directly (no logic duplication)
- Idempotency re-verified after fix: 2nd accept call = 200, one device
  row, no duplicate
- Lesson: task descriptions claiming "already fixed" still need
  verification — cross-check DEVLOG, don't assume

  ## 2026-07-15 · Batch 4 T16: Join screen + profile contract — DONE
- Join screen matches login/OTP visual style (LogoMark/PlateauCard/PrimaryButton)
- 🐛 Bug: router redirect only watched `status`, not `needsJoin` — after
  successful join, user stayed stranded on blank /join (backend succeeded,
  UI never re-navigated). Fixed: redirect now listens to (status, needsJoin).
- 🐛 Bug: no rule to move ACTIVE user off /join if somehow revisited — fixed
- Profile contract card reuses T14's contractProvider, no second fetch
- Full flow verified: invite→OTP→join→home→re-login-skips-join, all correct

## 2026-07-15 · EMPLOYEE MANAGEMENT MODULE — CLOSED, 17/17 final QA
- Full cross-platform story verified: owner creates employee+contract
  (React) → employee onboards (Flutter: OTP→Join→home) → punches
  in/out → owner sees it live, no refresh (device bound, attendance,
  This-month summary) → lifecycle cleanup (revoke→promote→archive→
  filter) all correct
- SMIC warning verified against actual code constant, not assumed
- Zero product bugs in final pass; 2 tooling-only issues (Playwright
  UTC-vs-local date, mis-tapped coordinate) — both documented, both
  self-corrected, neither is a product defect
- Verdict: READY TO DEMO to pilot clients

## 2026-07-16 · Reporting Sprint: Monthly Summary backend — DONE
- MonthlySummaryService: groups sessions by userId in-memory (no N+1),
  reuses SessionRepository.findByMonth from attendance path
- SIMPLIFIED overtime calc explicitly commented — monthly-average
  threshold, NOT per-week HCR complémentaires — revisit before real payroll
- Cross-checked manually: Lea 25min/11 sessions, Karim 612min/19 sessions
  (2 flagged) — both match attendance page exactly
- 403 for EMPLOYEE-role verified beyond required scope

## 2026-07-16 · Reporting Sprint: Monthly Summary frontend — DONE
- Reused MonthSelector/EmptyState/csvCell from AttendancePage — consistent style
- EN|FR export toggle: headers translate, data never does
- PDF via dedicated /reports/print route + window.print(), zero new deps
  (date-fns/locale/fr already bundled)
- Verified against real backend: Karim 612min→"10h 12min", 4 employees
  correctly flagged "No contract" (DB-verified)
- Gap found: no tenant-name endpoint exists for authenticated admin app
  (only exposed pre-login in invite flow) — print header dropped tenant
  name rather than fabricate it. TODO: add GET /api/me/tenant-name
  equivalent for admin role, or reuse existing /api/me/tenant

  ## 2026-07-16 · Scheduling Sprint Day 2: Backend data model + API — DONE
- New scheduling/ module: schedule_weeks, shift_templates, shifts
- DRAFT/PUBLISHED week lifecycle: edit-blocked once published (409),
  unlock via unpublish (OWNER-only, 403 for MANAGER)
- upsertShift updates in place for assigned users (tenant+user+date+slot),
  but every OPEN-shift POST inserts fresh — NULL user_id has no matchable
  identity, MySQL treats multiple NULLs as distinct under unique index.
  Confirmed intentional, not a bug — multiple open shifts same slot = fine.
- copyWeek shifts dates by actual day-delta (not hardcoded +7), supports
  copying any-to-any week, blocked if target already has shifts (409)
- 9/9 + 2 bonus checks (templates seed, delete-on-draft) all pass

## 2026-07-16 · Scheduling Sprint Day 3: React week grid — DONE
- Locked wire contract via live curl before coding: caught covering
  (not isCovering) and shiftDate/date asymmetry — both backend quirks,
  not bugs, now correctly handled client-side
- Grid: sticky employee column, 7-day × M/S native table, verified
  sticky survives 375px horizontal scroll
- Day-off hatch: real CSS repeating-linear-gradient, no image asset
- New lightweight anchored popover (not ModalShell) — deliberate,
  for high-frequency click speed vs centered modal overhead
- Cache patched via setQueryData on save, not full refetch
- Gap (expected, not a bug): covering-badge UI exists but untestable —
  no API sets covering=true yet, that's Day 4's job

  ## 2026-07-16 · Scheduling Sprint Day 4a: Shift covering backend — DONE
- markNeedsCovering: OPEN + remembers coveringForUserId, allowed even
  on PUBLISHED week (deliberate exception — real-time "called in sick")
- assignCoverer: 422 if covering-self, 422 if never marked needs-covering
- Bonus-verified: PUBLISHED-week exception scoped correctly — normal
  upsertShift still 409s on published, only needs-covering bypasses
- Extracted shared findShift helper (was inline-duplicated before)