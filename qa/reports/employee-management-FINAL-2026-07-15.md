# Employee Management Module — FINAL QA Report (Batches 1–4)

**Date:** 2026-07-15/16
**Scope:** Full cross-platform story — backend, admin panel (React), and mobile app (Flutter/Android) —
run as one continuous flow simulating a real owner onboarding a real new employee.

## Overall verdict: **YES — ready to demo to pilot clients as a complete feature.**

Every step of the cross-platform story — owner creates an employee and a contract in the admin panel,
the employee logs in on a fresh mobile install, accepts the invite, clocks in and out, and the owner
sees all of it reflected live back in the admin panel, followed by the full device-revoke/role-edit/
archive lifecycle — worked correctly with zero product defects found across 17 checks. The one issue
encountered during testing (a contract's start date landing on 15 Jul instead of 16 Jul) was traced to
my own test script using UTC instead of local time for "today," not a product bug — corrected mid-run
and re-verified. The demo path is solid end-to-end.

---

**Backend:** `http://localhost:8080` (`./gradlew bootRun --args='--spring.profiles.active=dev'`)
**Admin-web:** `http://localhost:5173` (`npm run dev`)
**Mobile:** Flutter debug build (`flutter run -d emulator-5554`, Pixel_6a_API_33), fresh install (`adb shell pm clear fr.plateau.plateau_mobile` before starting)
**Drivers:** Playwright + real Chrome for admin panel (Parts A, C, D); `adb`-driven UI interaction + screenshots for mobile (Part B)
**Test subject:** a brand-new employee, "Sofia Rossi" / sofia@example.com, taken through her entire lifecycle

---

## PART A — Owner side (React)

### [PASS] Step 1: Create employee "Sofia Rossi"
- Expected: Employee created, role Employee
- Actual: Created via the "Add employee" modal (sofia@example.com); confirmed present in the employee list immediately after
- Notes: Screenshot `A1-employee-created.png`

### [PASS] Step 2: Add contract CDI, 24h/week, 11.50€/h, start today
- Expected: Contract card updates with CDI / 24h/week / 11.50€/h
- Actual: Card updated immediately as expected
- Notes: Screenshot `A2-contract-added.png`. See the process note below about the start date.

### [PASS] Step 3: SMIC warning check
- Expected: verify empirically rather than assume — backend's SMIC threshold is `SMIC_HOURLY_CENTS = 1231` (12.31€) in `ContractService.java`. 11.50€/h = 1150 cents, which is BELOW 1231, so the warning SHOULD appear.
- Actual: The amber SMIC warning toast appeared, correctly, alongside the success toast.
- Notes: This resolves the ambiguity flagged in the task: the prompt's parenthetical ("11.50 > 12.31?") momentarily suggested the warning might not fire, but the actual comparison is 11.50 < 12.31, and the code and observed behavior both confirm the warning is the correct, expected outcome.

### [PASS] Step 4: Sofia shows "Invited" in employee list
- Expected: Status "Invited"
- Actual: Row shows "Invite sent" (the app's label for `INVITED`)
- Notes: Screenshot `A4-list-invited.png`

**Process note (test tooling, not a product bug):** the Playwright script used `new Date().toISOString().slice(0,10)` to fill the contract's start-date field, which computes the UTC date. Since the test machine is UTC+6 and the run happened in the first few hours after local midnight, this produced `2026-07-15` instead of the true local "today," `2026-07-16`. This was caught downstream (mobile Profile showed "Since 15 Jul 2026" instead of the expected 16th) and corrected directly in the dev DB before Part C, then re-verified on mobile (see Part B, Step 10). The admin panel's own default value for this field (`format(new Date(), 'yyyy-MM-dd')` from `date-fns`, which is local-time-based) would **not** have had this problem — this was purely an artifact of how the automation overrode that field with a UTC-computed value, not a bug in the product's date handling.

---

## PART B — Employee side (Flutter, fresh install)

### [PASS] Step 5: Login as sofia@example.com via OTP
- Expected: OTP flow succeeds
- Actual: Entered email → OTP read from backend console → code auto-submitted on completion → login succeeded (`✅ LOGIN` in app log)
- Notes: Screenshots `B1`–`B3`

### [PASS] Step 6: Lands on /join, not /home
- Expected: INVITED employees are held on `/join`
- Actual: Confirmed — screen shows "Demo Restaurant has invited you" / "You're joining as Sofia Rossi" / "Join Demo Restaurant" button
- Notes: Screenshot `B4-after-login.png`. (A first attempt at tapping "Join" mis-hit "Sign out" due to a coordinate-scaling error on my part — the app correctly logged out and returned to the email login screen, which is itself correct behavior for a Sign Out tap, not a bug. Re-logged in and confirmed `/join` again identically on the second attempt — screenshot `B4b-join-screen-retry.png` — before tapping the correct button.)

### [PASS] Step 7: Tap Join → haptic + navigation to /home
- Expected: Haptic feedback fires, navigates to /home
- Actual: App log shows `✅ JOINED — tenant: Demo Restaurant` (the debugPrint immediately follows the `HapticFeedback.mediumImpact()` call in `JoinScreen._join`, confirming that code path executed); screen transitioned to the home screen ("Hello, Sofia 👋", "Ready to clock in")
- Notes: Screenshot `B5-after-join-retry.png`. Haptic feedback itself isn't visually verifiable from a screenshot/log, but the log confirms the surrounding code path ran without error.

### [PASS] Step 8: Punch IN via debug FAB → punch OUT → both work
- Expected: Both punches succeed
- Actual: App log: `🟢 PUNCH IN (NFC)` then `🔴 PUNCH OUT (NFC) — session: 0min`; UI transitioned "Ready to clock in" → "Clocked in since 04:15" → "See you soon, Sofia / Exit recorded" → back to "Ready to clock in"
- Notes: Screenshots `B6b-fab-tapped-correct.png`, `B7-punched-out.png`. Found the FAB's exact tap coordinates (975, 2080) via `adb shell uiautomator dump` after an initial miss.

### [PASS] Step 9: My Hours tab shows today's session
- Expected: Today's session appears
- Actual: "Thursday, 16 July / 04:15 → 04:15 / 0min / NFC" row present; "This month: 0h 00min" summary and "Contract: 24h/week" also shown at the bottom of the same screen
- Notes: Screenshot `B8-my-hours-correct.png`

### [PASS] Step 10: Profile tab shows "My contract"
- Expected: CDI, 24h/week, 11.50€/h
- Actual: "My contract" card shows CDI badge, 24h/week, 11.50€/h, "Since 16 Jul 2026" (after the DB correction described above and a tab-navigation refetch)
- Notes: Screenshots `B9-profile.png` (pre-correction, showed 15 Jul) and `B9b-profile-refetched.png` (post-correction, correctly shows 16 Jul) — this confirms the Profile screen's contract data isn't stale-cached but reflects live backend state on refetch.

---

## PART C — Owner side confirms mobile actions (React)

### [PASS] Step 11: Employee list shows Active + Bound
- Expected: Sofia now "Active" status + "Bound" device
- Actual: Row: `Sofia Rossi / sofia@example.com / Employee / Active / Bound / Android • 16 Jul / 16 Jul 2026` — both the join (INVITED→ACTIVE) and device enrollment (from `/api/invite/accept`) are reflected without any manual admin action
- Notes: Screenshot `C11-list-active-bound.png`

### [PASS] Step 12: Detail page "This month" shows today's session
- Expected: Punch history shows today's session
- Actual: Sofia's detail page "This month" card shows the session with method NFC
- Notes: Screenshot `C12-detail-this-month.png`

### [PASS] Step 13: Attendance page shows her session when searched
- Expected: Searching "Sofia Rossi" surfaces her session
- Actual: Confirmed, one matching row
- Notes: Screenshot `C13-attendance-search.png`

---

## PART D — Lifecycle cleanup (React)

### [PASS] Step 14: Revoke her device from detail page
- Expected: Bound → Not enrolled
- Actual: Confirmed "Bound" before, "Not enrolled" after, updated in place without a page reload (confirm dialog accepted, "Device revoked" toast)
- Notes: Screenshot `D14-device-revoked.png`

### [PASS] Step 15: Edit role Employee → Manager
- Expected: Role updates
- Actual: Detail page shows "Manager" badge after saving
- Notes: Screenshot `D15-role-changed.png`. `EmployeeService.updateEmployee`'s "must keep at least one owner" guard correctly did not block this, since Sofia was never an OWNER — that guard is scoped to demoting an OWNER, not promoting an EMPLOYEE.

### [PASS] Step 16: Archive her
- Expected: Archiving succeeds
- Actual: "Employee archived" toast observed
- Notes: Screenshot `D16-archived.png`. Confirmed still archivable in her post-promotion MANAGER role (only OWNER rows hide the archive action).

### [PASS] Step 17: Hidden from default view, findable via Archived filter, dimmed
- Expected: Disappears from default list view; findable + dimmed under Status=Archived
- Actual: Search "Sofia Rossi" under the default (non-archived) filter returns no rows; switching Status filter to "Archived" surfaces exactly one row for her, carrying the `opacity-60` class
- Notes: Screenshot `D17-archived-filter.png`

---

## Summary

| Total | Passed | Failed | Blockers |
|---|---|---|---|
| 17 | 17 | 0 | 0 |

**Zero product bugs found across the entire Employee Management module (Batches 1–4).** The full
cross-platform lifecycle — owner-side creation and contract management, employee-side onboarding and
time-tracking on a fresh mobile install, live propagation of mobile actions back into the admin panel,
and the complete device/role/archive lifecycle — all behaved correctly and consistently. The two
hiccups during this session (a mis-tapped button that triggered a harmless sign-out, and a UTC-vs-local
date artifact in my own test script) were both test-process issues, diagnosed and either re-verified or
corrected in place, and are documented above for transparency — neither reflects a defect in the
product itself.
