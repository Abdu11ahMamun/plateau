# Pre-Demo Final QA Report — Employee Management + Attendance + Scheduling

**Date:** 2026-07-16
**Scope:** Full demo-rehearsal story across Schedule creation, Covering, Copy + Breaks, and
data-integrity/edge cases — exactly what will be shown to the client tomorrow.

## VERDICT (updated after retest): Demo-ready, 0 known issues.

~~Demo-ready with two rough edges to steer around — do NOT scroll the schedule grid on a narrow
window, and do NOT demo "Copy last week" right after a Covering assignment.~~ **Both fixed and
reverified — see "Retest — 2026-07-16" below.** Everything that will actually be *clicked through*
in a normal desktop-width demo — building a week, publishing it, marking someone as needing cover
and assigning a replacement, editing the break default, and the role/security boundaries around
all of that — worked correctly and looked clean in every screenshot from the original pass. The two
bugs found in that pass (copy dropping covering metadata; sticky header bleed-through on mobile
scroll) have both been fixed and independently reverified against the new backend/frontend build —
no known issues remain, and no demo-time workarounds are needed.

---

## PART A — Schedule creation

### [PASS] Step 1: Navigate to /schedule, current week
- Expected: Schedule page loads showing current week (Monday of the week containing today, 2026-07-16 → 13 Jul 2026)
- Actual: "Week of 13 Jul 2026" shown
- Notes: Screenshot `A1-schedule-current-week.png`. Cleared stale leftover shift/week data for this week (and next week, needed for Part C) from prior dev/test sessions before starting, so the mini-week below reflects only this session's actions.

### [PASS] Step 2: Fill a realistic mini-week
- Expected: Lea Mon-M 10:00-18:00, Karim Mon-S 18:00-23:00, Lea Tue Day-off, one shift marked OPEN
- Actual: All four created correctly and verified via the API response (not just visually) — Lea Mon-M `10:00:00→18:00:00 SCHEDULED`, Karim Mon-S `18:00:00→23:00:00 SCHEDULED`, Lea Tue M+S both `DAY_OFF`, Karim Wed-M `OPEN`
- Notes: Screenshot `A2-mini-week-filled.png`. **Worth knowing for the demo narration:** the grid has one row per employee, so there is no click path to create a truly row-less "unassigned" shift — marking a cell "Open" still saves it with that employee's `userId` attached (confirmed via API: the Open shift's `userId` is Karim's id, not null). It reads visually as "open" (dashed border, italic "Open" label) but is really "this employee's slot is open/tentative," not "anyone can claim this slot." The only path to a genuinely unassigned (`userId: null`) OPEN shift is via the Covering flow (Part B), which behaves differently and correctly. Not a bug — just don't describe the plain "Open" status live as "unassigned to anyone," since technically it isn't.

### [PASS] Step 3: Break line shows correctly on scheduled cells
- Expected: Lea's Mon-M cell (Matin template, 20min break) shows a break line; Karim's Mon-S cell (Soir template, 0min break) shows none
- Actual: Lea's cell shows "10:00–18:00 · 20min break"; Karim's cell shows "18:00–23:00" with no break line — confirmed this is intentional (`Cell` only renders the break line when `effectiveBreakMinutes > 0`), not a missing-data bug
- Notes: Visible directly in `A2-mini-week-filled.png`

### [PASS] Step 4: Publish → read-only state confirmed
- Expected: Week shows "Published" badge; editing is blocked
- Actual: Badge changed Draft→Published; clicking a previously-editable scheduled cell now shows "Week is published — unpublish to edit" instead of the edit form
- Notes: Screenshots `A4-published.png`, `A4b-readonly-popover.png`

### [PASS] Step 4b: MANAGER cannot unpublish
- Expected: A MANAGER-role user can't unpublish
- Actual: Verified two ways — (1) promoted an existing employee (Abdullah) to MANAGER via the UI, logged in as him: the "Unpublish" button is not rendered in the UI at all (`isPublished && isOwner` gate); (2) called `POST /api/admin/schedule/week/{id}/unpublish` directly with his MANAGER token — server independently rejects it: `403 "Only OWNER can unpublish a week"`. Reverted his role back to EMPLOYEE afterward to leave dev data clean.
- Notes: Screenshot `A4c-manager-view-no-unpublish.png`. Both the UI gate and the server-side check agree — this isn't just a hidden button, the boundary is enforced where it matters.

---

## PART B — Covering

### [PASS] Step 5: Mark Lea's Mon-M shift as needing coverage (on the published week)
- Expected: Shift goes OPEN, with history preserved
- Actual: `userId` cleared to `null`, `status: OPEN`, `coveringForUserId: 3` (Lea) — done directly on the already-published week, with no unpublish step required (this is deliberate: `ScheduleService.markNeedsCovering` has no draft/published check, since a "someone called in sick" event is real-time, not a planning edit)
- Notes: Screenshot `B5-needs-coverage.png`

### [PASS] Step 6: Assign Karim as coverer
- Expected: Covering badge + tooltip
- Actual: Shift reassigned to Karim (`userId: 1`, `status: SCHEDULED`, `covering: true`, `coveringForUserId` still `3`, preserving history); Karim's Mon-M cell shows a small green covering badge whose `title` attribute reads exactly "Covering for Lea Martin"
- Notes: Screenshot `B6-coverer-assigned.png` — visually clean, the badge is small but legible and the grid layout handles the badge without any overlap issues

---

## PART C — Copy + Breaks

### [FAIL] Step 7: Copy this week to next week
- Expected: Shifts + break overrides carried over correctly, including the covering assignment from Part B
- Actual: Times, statuses (SCHEDULED/DAY_OFF/OPEN), and break overrides all copied correctly for every shift — **except** the covering shift: the copy has `covering: false` and `coveringForUserId: null`, silently losing both the badge and the "who was originally supposed to work this" history. Confirmed at the database level (source shift id=18: `is_covering=1, covering_for_user_id=3`; copy id=23: `is_covering=0, covering_for_user_id=NULL`).
- Notes: Screenshot `C7-copied-week.png`. The underlying shift itself is not lost or corrupted — Karim still has a normal 10:00–18:00 shift on the copied week's Monday — it just silently loses the fact that it was a covering assignment.

### 🐛 BUG REPORT
- Owner: backend
- Endpoint: `POST /api/admin/schedule/copy`
- File likely responsible: `ScheduleService.copyWeek()` — it builds each copy via `new Shift(tenantId, weekId, userId, date, slot, startTime, endTime, status, note)`, which is the constructor that always sets `covering = false` and leaves `coveringForUserId` at its Java default (`null`); the method calls `copy.setBreakMinutes(...)` afterward but never calls an equivalent `copy.setCovering(...)` / `copy.setCoveringForUserId(...)`.
- Repro (exact steps): mark a shift as needing coverage, assign a coverer (so it has `covering=true` and a `coveringForUserId`), then `POST /api/admin/schedule/copy` with that week as source and an empty week as target. Inspect the copied shift — `covering` is `false` and `coveringForUserId` is `null`.
- Severity: HIGH — silent data loss (of metadata, not the shift itself) on a feature the demo explicitly walks through in sequence (Covering in Part B, Copy in Part C).
- Demo-safe workaround: **Don't run "Copy last week" on a week that currently has an active covering assignment during the live demo.** Either demo Copy on a week without any covering shifts, or demo Covering and Copy on two unrelated weeks so the presenter never has to explain why the copied badge is gone.

### [PASS] Step 8: Tenant break-default round-trips (documented limitation verified, not just assumed)
- Expected: Setting itself round-trips; do NOT expect it to appear on new shifts
- Actual: `GET /api/admin/settings/break-default` read 20 before, `PUT` to 15 succeeded, subsequent `GET` correctly read back 15 — the setting itself round-trips cleanly. Then created a brand-new SCHEDULED shift on the M slot and checked its `effectiveBreakMinutes`: it was **20**, not 15 — confirming new shifts still pull from the Matin `ShiftTemplate`'s break value, never the tenant default, exactly as flagged as a known limitation.
- Notes: Screenshot `C8-break-default-changed.png`. Root cause verified in code: `ScheduleService.attachEffectiveBreak()` checks for a matching `ShiftTemplate` by slot *first* and only falls back to the tenant setting if none exists. Since both `M` and `S` slots have a seeded template in this tenant, the tenant default is currently unreachable for any real shift — this isn't a "sometimes" limitation, it's total for this dataset. Worth flagging to the client as expected/by-design if asked, not as a bug.

---

## PART D — Cross-check against Attendance/Employee data

### [PASS] Step 9: Schedule rows match the ACTIVE employee list exactly
- Expected: No archived employees appear as schedule rows
- Actual: Schedule grid rows (Karim Dupont, Lea Martin, Abdullah Al Mamun, Flutter Test User, Flutter Test User 2, Flutter Test User 3) exactly match `GET /api/employees` filtered to `status=ACTIVE` — confirmed as an exact set match, not just "looks about right." None of the 5 archived employees in this tenant (Ahmed Ben Ali, Em, Sofia Rossi, Temp Manager QA, Test QA Renamed) appear.
- Notes: Screenshot `D9-schedule-rows.png`

### [PASS] Step 10: Karim's covering shift creates no phantom attendance record
- Expected: Scheduling and attendance stay fully separate — no punch/session record from a scheduled shift
- Actual: Queried `GET /api/admin/attendance?month=2026-07` directly (not just glanced at the UI) and confirmed zero attendance rows for Karim on either 2026-07-13 or 2026-07-20 (the two dates of his covering shifts, original + copied). Shifts and Sessions are separate entities/tables with no shared write path in the backend — confirmed empirically rather than assumed from reading the code.
- Notes: No screenshot needed — this was an API-level data check.

---

## PART E — Edge cases

### [PASS] Step 11: Direct edit on a published week still blocked
- Expected: 409-equivalent behavior even bypassing the UI
- Actual: `POST /api/admin/schedule/shifts` (upsert) on the published week → `409 "Cannot edit a published week — unlock it first"`; `DELETE /api/admin/schedule/shifts/{id}` on the same week → `409` as well. Both enforced server-side, matching the UI's read-only message from Part A.
- Notes: Confirms an OWNER/MANAGER can't bypass the publish lock even via a direct API call (e.g. a stale tab or replayed request), not just that the UI hides the controls.

### [PASS] Step 12: assign-coverer on a shift not marked needs-covering
- Expected: not reachable via UI; if reachable, backend rejects it
- Actual: Confirmed not reachable through normal navigation — clicking a normal (non-covering) scheduled shift never renders an "Assign coverer" control, only the standard published-week read-only message. Called the endpoint directly anyway: `POST /api/admin/schedule/shifts/{id}/assign-coverer` on a shift that was never marked needing coverage → `422 "This shift was not marked as needing coverage"`.
- Notes: Screenshot `E12-not-needs-covering-popover.png`. Exactly the "backend-only edge case, UI correctly prevents reaching this state" scenario anticipated by the task.

### [FAIL] Step 13: Mobile 375px — sticky column + horizontal scroll
- Expected: Grid remains usable — sticky employee column, working horizontal scroll
- Actual: The grid genuinely IS horizontally scrollable at 375px, and the sticky Employee column does stay positioned at the left edge structurally — but its **header** renders garbled, overlapping text once scrolled. The day-of-week column headers (e.g. "TUE", "WED 15 JUL") visually bleed through and overlap the "EMPLOYEE" header text, producing garbage like "TUEMPLOYEE". This was caught by actually performing a scroll (`scroller.scrollLeft = 400`) and screenshotting the result — a static glance at the unscrolled page looks completely fine, which is exactly why this needed careful checking, per the task's warning.
- Notes: Screenshots `E13a-mobile-375-initial.png` (clean, before scrolling) vs `E13b-mobile-375-scrolled.png` (garbled, after scrolling). The employee **name** rows (body cells) scroll cleanly with no overlap — only the header row is affected.

### 🐛 BUG REPORT
- Owner: frontend
- Page/Component: `admin-web/src/pages/SchedulePage.tsx` — the sticky `<th>` header cells for the "Employee" column (both header rows: `sticky left-0 z-20 ... bg-mist/60` and `sticky left-0 z-20 ... bg-mist/40`)
- Repro steps: resize the browser to 375px width, open `/schedule`, horizontally scroll the grid (touch-drag on a real device, or `element.scrollLeft = 400` for a quick repro)
- Expected: Employee column header stays cleanly readable and opaque while day columns scroll underneath it
- Actual: Scrolled-under day-of-week header text bleeds through the semi-transparent Employee header background, producing overlapping/garbled text
- Suspected root cause: the header cells use Tailwind's opacity-modified backgrounds (`bg-mist/60`, `bg-mist/40` — 60% and 40% opacity respectively) instead of a solid background. The equivalent sticky *body* cells use plain `bg-white` (fully opaque) and render cleanly, which is the clearest evidence for the fix direction — the header cells just need an opaque background too.
- Severity: HIGH — this is a real, easily-triggered visual bug on exactly the viewport size the task flagged as a demo risk area, and it's the first thing a viewer would notice if the presenter scrolls the schedule grid on a phone or a narrowed browser window live.
- Demo-safe workaround: **Don't horizontally scroll the Schedule grid on a narrow/mobile-width window during the live demo.** Show the Schedule module at normal desktop width (all 7 days fit without scrolling there) — the bug does not reproduce at that width. If a mobile view must be shown, show it un-scrolled (Monday's columns only, as in `E13a`) and don't scroll live.

---

## Summary

| Total | Passed | Failed | Blockers |
|---|---|---|---|
| 14 | 12 | 2 | 0 |

Zero blockers — nothing prevents the core demo story from working end-to-end exactly as scripted
in Parts A, B, and D. Both failures are real, confirmed bugs (not test-tooling artifacts — each was
independently verified at the database/API level) with straightforward live-demo workarounds:
avoid "Copy last week" immediately after a Covering assignment, and avoid horizontally scrolling
the Schedule grid at narrow/mobile widths. Everything else — week creation, break-line display,
publish/read-only enforcement, the OWNER-only unpublish boundary (checked both in the UI and
directly against the API), the full Covering flow with its badge and tooltip, the tenant
break-default setting's round-trip, employee-list/schedule-row data integrity, the
scheduling/attendance separation, and the two backend-only edge cases in Part E — held up cleanly
under close inspection.

---

## Retest — 2026-07-16

Backend and frontend restarted to pick up the fixes. Diff confirmed before retesting:
`ScheduleService.copyWeek()` now calls `copy.setCovering(shift.isCovering())` and
`copy.setCoveringForUserId(shift.getCoveringForUserId())` when building each copied shift; the
sticky Employee `<th>` header cells in `SchedulePage.tsx` changed from semi-transparent
`bg-mist/60`/`bg-mist/40` to opaque `bg-mist`.

Only the two previously-failing checks were re-run, per instruction — the other 12 checks from the
original pass are unaffected by these fixes and were not repeated.

### [PASS] Retest 1: Copy a week with an active covering assignment
- Expected: The copy preserves `covering:true` and `coveringForUserId` correctly, verified via a fresh `GET` on the new week (not just the copy mutation's response)
- Actual: Reused the source week (2026-07-13, PUBLISHED) which still had its original covering assignment from the first pass (Karim covering for Lea's Mon-M shift: `covering:true, coveringForUserId:3`) — cleaned the target week (2026-07-20) of its old buggy-copy leftovers first, then used the same UI action as the original test ("Copy last week" from the 2026-07-20 view, which copies from 2026-07-13). Fetched the target week fresh via `GET /api/admin/schedule/week?start=2026-07-20` *after* the copy completed (not the copy response body) and found the copied shift with `covering:true, coveringForUserId:3` — identical to the source. All other fields (times, break, status) also carried over correctly, as they did originally.
- Notes: Screenshot `RETEST1-copied-week.png`. Bug is fixed.

### [PASS] Retest 2: Mobile 375px, horizontal scroll through multiple offsets
- Expected: Sticky Employee column header and all employee-name cells stay fully opaque and readable at every scroll position, not just the start/end
- Actual: Scrolled the grid programmatically through 7 offsets (0, 150, 300, 450, 600, 750, 900px — well beyond just start/end) and at every single one: the header cell's text content was exactly `"Employee"` (no bled-through characters) with a fully opaque computed background (`rgb(240, 239, 233)`, no alpha channel); every employee-name body cell (Karim Dupont, Lea Martin, Abdullah Al Mamun) also stayed opaque and fully readable. No overflow on the outer page at any point.
- Notes: Screenshots `RETEST2-scroll-0.png` through `RETEST2-scroll-900.png` (7 total, one per offset). Bug is fixed — confirmed across a full scroll sweep, not just the two endpoints.

### Retest summary

| # | Check | Original | Retest |
|---|---|---|---|
| 7 | Copy preserves covering metadata | FAIL | **PASS** |
| 13 | Mobile 375px sticky header stays opaque | FAIL | **PASS** |

Both previously-failing checks now pass. Combined with the 12 unaffected checks from the original
pass, the module is **14/14 pass, 0 known issues** as of this retest.
