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

## 2026-07-16 · Scheduling Sprint Day 4b: Covering UI — DONE
- Bug caught: marking needs-coverage sets userId=null, which would
  silently vanish the shift from the grid's userId-keyed lookup.
  Fixed: added needsCoveringByKey fallback (keyed by coveringForUserId)
  so the gap stays visible on the original employee's row until assigned
- Correctly honored backend's deliberate published-week exception:
  Needs-coverage/assign-coverer available regardless of publish state,
  while normal Save/Clear/status editor stays draft-only
- Popover 3-way branch: needs-cover-with-history / published-readonly
  / normal-draft-editor
- Tooltip built from unfiltered employee list (resolves name even if
  original employee later archived)
- Full flow verified end-to-end, including exact confirm-dialog wording
  and dropdown exclusion of the original employee

  ## 2026-07-16 · Scheduling Sprint Day 4c: Breaks — DONE
- effectiveBreakMinutes: @Transient, computed at read time in every
  shift-returning method (upsert/copy/covering/get) — override → template
  → tenant default, resolved fresh every read, no backfill needed
- Fallback chain genuinely exercised: temporarily removed Soir template
  to force tier-3 fallback, confirmed 30 (new default) not stale 20,
  restored afterward
- copyWeek now carries breakMinutes override to the copy (unprompted,
  correct call — "equivalent shift" shouldn't silently drop an override)
- DEFAULT_BREAK_MINUTES_KEY defined once, shared between ScheduleService
  and TenantSettingsController — no duplicated literal

  ## 2026-07-16 · Scheduling Sprint Day 4d: Breaks UI — DONE
- Break line on cell: text-[9px], deliberately smaller than the 10px
  time text above it (literal text-xs would've inverted the hierarchy)
- Popover break field prefill chain: effectiveBreakMinutes ?? template
  ?? tenantDefault — sane default even on fresh cells
- BreakDefaultCard placed above grid (no Settings page exists yet —
  flagged as a real gap, not silently built around)
- Template CRUD UI: confirmed via grep it doesn't exist anywhere,
  skipped per instruction rather than scope-creep a new page
- MANAGER hide-not-disable tested with a real temp account, not assumed
- 🔍 FINDING (not a bug): tenant break-default is currently unreachable
  in the UI — Matin/Soir templates are always seeded for M/S, so the
  3rd fallback tier (tenant default) never actually triggers today.
  Setting itself verified correct (round-trips, persists); only the
  "flows to a new shift" observable effect is untestable under current
  seed data. Worth knowing before demo — don't claim this tier live.

  ## 2026-07-16 · Pre-demo Final QA — 12/14 PASS, 0 blockers, DEMO-READY
- Verdict: ready with two avoid-this-click workarounds
- 🐛 Bug: copyWeek() silently drops covering (is_covering/covering_for_
  userId reset), times/breaks/status copy fine — DB-level confirmed,
  backend bug. Workaround: don't copy a week with an active covering
  assignment during demo. TODO: fix before real pilot use.
- 🐛 Bug: sticky Employee-column header garbles on mobile horizontal
  scroll (≤375px) — semi-transparent bg lets scrolled text bleed
  through. Only visible mid-scroll, not on static screenshot.
  Workaround: demo Schedule at desktop width, don't scroll narrow.
- Verified server-side (not just UI-hidden): MANAGER-can't-unpublish,
  published-week-edit-blocked — both hold at API level
- Presenter note: "Open" status still carries userId (means "this
  person's slot is tentative"), only Covering produces truly unassigned


## 2026-07-16 · Post-QA bug fixes — both verified, demo-ready
- copyWeek(): fixed missing covering/coveringForUserId copy (root
  cause: Shift copy-constructor takes fixed field subset, covering
  defaults false internally). Verified via fresh GET, not copy response.
- Sticky header scroll-bleed: root cause was ONLY the two <th> sticky
  cells using bg-mist/60 and bg-mist/40 (transparent). Employee-name
  <td> was already bg-white/opaque — task assumed both were broken,
  agent grepped first and found only half were. Non-sticky day headers
  correctly left untouched (never part of the bug).
- Verified at 3 scroll offsets (180/350/600px), not just before/after

## 2026-07-16 · Post-fix retest — 0 known issues, DEMO-READY
- Both bugs confirmed fixed: copy-preserves-covering (fresh GET
  verified), sticky header (7 scroll offsets, not just endpoints)
- pre-demo-final-2026-07-16.md verdict updated: "Demo-ready, 0 known
  issues"
- Scheduling memory cleaned of stale bug warnings


## 2026-07-16 · Leave Management Backend (L1-L3) — DONE
- New leave/ module: leave_types, leave_requests, full request/decide/
  cancel lifecycle
- Maladie (sick) auto-approves per requires_approval=false — correctly
  distinct from Congés payés which requires owner decision
- Overlap check blocks PENDING/APPROVED collisions, ignores REJECTED/
  CANCELLED (correct — a rejected request shouldn't block a new one)
- userId spoofing structurally impossible: CreateLeaveRequest has no
  userId field, SecurityUtils.getCurrentUserId() is the only source
- Cancel is requester-only even for OWNER (by design — OWNER uses
  reject instead to undo someone else's leave)
- Rejection requires a note (422 if blank), approval doesn't
- isUserOnApprovedLeave() ready but unwired — Schedule integration
  is a separate future task, not done here

  ## 2026-07-17 · Leave Cancel button — RESOLVED, root cause: emulator sleep
- 3 sessions of investigation, ultimately a false alarm on the code side
- Root cause: emulator screen sleeps after idle periods; taps after a
  long wait (setup, rebuild, relaunch) silently don't reach the app —
  no crash, no log, just zero effect. Looks identical to a hit-test bug.
- Fix applied going forward: `adb shell settings put system
  screen_off_timeout 1800000` at the start of any Flutter debugging
  session with expected idle gaps (login flows, waiting on rebuilds, etc)
- LESSON for future sessions: if a tap produces literally zero log
  activity (not even routine EGL_emulation/Choreographer frame noise),
  suspect screen-sleep/lock BEFORE suspecting the widget tree — check
  `dumpsys power` wakefulness state first, it's a 5-second check that
  would have saved 2 of the 3 sessions spent here
- Leave module cancel flow confirmed working end-to-end, code was
  correct throughout (both static-analysis rounds were accurate)
- Note: request id=6 status changed to APPROVED outside this test's
  visibility — not a regression, just untracked; worth a quick DB
  glance next session if it matters for demo data cleanliness

  1. Backend: EmployeeController-এর 2টা missing guard        (urgent, live hole)
2. Backend: EmployeeService-এর hardcoded TENANT_ID          (urgent, tenant leak)
3. Frontend: route guard + sidebar filter + button role-gate (UX, backend-ই আসল রক্ষা)


## 2026-07-17 · Role-security fix — 2 backend holes + full frontend gating
- EmployeeController: create()/archive() were missing requireOwnerOrManager()
  (present on update()/resendInvite() in the same file) — added, verified
  403 where it was 201/204
- EmployeeService: hardcoded TENANT_ID=1L removed entirely, now flows from
  SecurityUtils.getCurrentTenantId() via controller param — matches
  Contract/Schedule/Leave service pattern. Grep-confirmed zero remaining refs.
- Tenant isolation proven Karim-side (tenant-1 token can't see/archive
  tenant-2 employee) — couldn't test the reverse direction because of
  finding below
- 🔴 NEW FINDING (not fixed, needs own pass): OtpService.findUser() has
  its OWN hardcoded TENANT_ID=1L — no user outside tenant 1 can even
  request an OTP or log in. This means the "multi-tenant: Done" status
  in the Master Plan was incomplete — the hardcoded-tenant pattern was
  copy-pasted across services before that audit and OtpService was missed.
  MUST fix before onboarding any 2nd real client.
- Frontend: RequireAuth extended with role-array + /not-authorized
  redirect, applied to ALL 6 real pages (agent correctly checked backend
  guards on Live Board/Attendance too, found same OWNER/MANAGER-only
  enforcement, included them rather than leaving 2 pages inconsistent)
- Architectural finding: there is now literally no EMPLOYEE-facing page
  in admin-web. Lea can log in but lands on "not authorized" everywhere.
  This is correct given current backend scope, but raises a product
  question: should EMPLOYEE accounts even have admin-web logins at all,
  long-term? (Flutter is their actual app.) Not urgent, worth deciding.
- Known inconsistency (not fixed): MobileNav.tsx is a separate, stale
  component with an unconditional Live Board tab — doesn't match
  Sidebar.tsx's nav set at all. Low priority, flagged.
- Full 21-endpoint regression + positive-path (Karim still works) both
  re-verified, zero regressions

  ## 2026-07-17 · Multi-tenant fix complete: OtpService — DONE
- Removed hardcoded TENANT_ID=1L from findUser() — pre-login flow has
  no JWT yet, so lookup is now unscoped by tenant, resolved by match count
- 1 match → proceed (unchanged). 0 matches → 404 (unchanged). >1 match
  (same email across tenants, since uq_tenant_email is per-tenant not
  global) → 409 "used in more than one organization" — fails loudly
  rather than silently picking a tenant. Confirmed via migration read,
  not assumed.
- Verified: real 2nd tenant OWNER can now requestOtp/verifyOtp, JWT
  correctly shows tenantId:3 not hardcoded 1. Tenant-1 users unaffected.
- Side effect: otp_codes has no tenant_id column, but the ambiguity
  check fires before any OTP row is touched — gap closed incidentally
- Multi-tenant guard (Master Plan Build 4) now genuinely complete:
  EmployeeService + OtpService both fixed. Was marked "Done" prematurely
  before this session — the hardcoded-tenant pattern was copy-pasted
  across services and only partially caught in the original audit.

  ১. getEmployeeColor(employeeId) — deterministic color palette
   প্রতিটা employee-র জন্য সবসময় একই রং (id হ্যাশ করে palette থেকে বেছে নেওয়া)
   ব্যবহার হবে: avatar, Schedule grid accent, Timeline bar fill

২. Schedule-এ নতুন "Timeline" view (Grid view-এর পাশে toggle)
   - Grid view: এখনকার click-to-fill (অপরিবর্তিত, data entry-র জন্য)
   - Timeline view: একদিনের horizontal Gantt — employee সারি,
     সময়-অক্ষ (৬টা সকাল থেকে যতক্ষণ শেষ shift), প্রতিটা shift
     employee-র নিজস্ব রঙে bar হিসেবে, বার length = duration
   - Bar click করলে একই edit popover খোলে যেটা Grid-এ আছে
     (নতুন কিছু বানাতে হবে না, reuse)


    ## 2026-07-22 · Employee colors + Schedule Timeline view — DONE
- 🐛 Fixed before shipping: naive palette[id % 8] collided for IDs 8
  apart (Karim id=1, Abdullah id=9 → same color, reproducing the exact
  client complaint). Replaced with integer-avalanche hash, seed tuned
  so current 6 active employees are all distinct. 8-color palette has
  a hard ceiling — >8 active employees will eventually collide, this
  is a known limit, not a bug, worth revisiting if roster grows.
- Gap found: brief assumed Grid's leave-conflict badge was already
  wired (it wasn't — backend field existed, frontend Shift type and
  Cell render never used it). Built LeaveConflictBadge once, Grid and
  Timeline both import the same component — one source of truth.
- Timeline view: per-employee colored bars, positioned/sized by real
  start/end time, dynamic hour-axis range (not hardcoded), reuses
  Grid's exact CellPopover for editing (no duplicate edit logic)
- Scope calls (explicit, not silent): only SCHEDULED shifts get bars
  (DAY_OFF/ABSENT/OPEN show empty track); break notch is a cosmetic
  midpoint marker since backend only stores duration, not position
  within the shift; Timeline is view-only for creation (use Grid to add)
- Employee colors now consistent across Employees/LiveBoard/Attendance/
  Schedule — addresses both pieces of demo-2 feedback in one pass


  ## 2026-07-22 · Timeline UX polish — DONE, 3 root-cause fixes
- Hour axis: translate-x-1/2 centering caused edge-tick label bleed
  outside scrollWidth (permanently unreachable, not just visually
  clipped). Fixed via left-align + trailing padding. Bonus: gridlines
  were phase-misaligned to pixel-0 not to actual tick positions — fixed.
- Name column: widened 176→220px based on real longest name (19 chars),
  title-attribute fallback kept as free insurance regardless
- Break notch: root cause was pointer-events-none explicitly blocking
  all hover — not a missing tooltip mechanism. One-line fix once found.
- Added: 60px width floor drops in-bar text for very short shifts
  (relies on tooltip instead), non-collapsible 3-item legend
  (judged collapse toggle = more UI than content it hides)


  ## 2026-07-23 · M1 Session Corrections + M2 Anomaly Flag Queue — DONE
- Corrections: fully immutable entity (no setters), read-time
  resolution (Session/TimeEvent rows never touched)
- Payroll integration verified with real arithmetic: 25−3+211=233,
  matches exactly. Deleted correction → reverted cleanly, proving
  read-time not write-time model
- Flag Queue: resolved/unresolved filter, APPROVED/REJECTED tracking,
  reuses CorrectionService so a corrected+flagged session shows
  correct values in both places
- Finding: PunchEvaluator never actually produces REVIEW status (only
  AUTO/FLAGGED) — queue supports it via schema but it's currently dead
  code path. Also: flagReason was computed but never persisted anywhere
  in the existing schema — queue substitutes method+trustScore instead
- Deliberate scope limit: REJECTED does not auto-exclude from payroll,
  records judgment only — follow-up product decision, not built here

  ## 2026-07-23 · Fix: sessionId on AttendanceRow + 401-instead-of-400 bug
- AttendanceRow gained sessionId field — unblocks Corrections UI row actions
- 🐛 Root cause (traced via logs, not guessed): malformed path variable
  → Spring's MethodArgumentTypeMismatchException → correct 400 → 
  container re-dispatches to /error → JwtAuthFilter's default
  shouldNotFilterErrorDispatch()=true skips JWT re-check → STATELESS
  policy means empty SecurityContext on that dispatch → /error wasn't
  in permitAll → Spring Security's entry point fires, overwrites 400
  with our custom 401 → frontend's global 401-handler force-logs-out
  the user. This is exactly why a bad session ID click would have
  silently booted an OWNER out of their own session.
- Fix: added /error to permitAll in SecurityConfig. JwtAuthFilter itself
  untouched — this is the standard minimal remedy for this well-known
  Spring Security + custom-filter-chain pattern.
- Verified no regression: 404 unchanged, no-token 401 unchanged, direct
  /error hit exposes nothing sensitive