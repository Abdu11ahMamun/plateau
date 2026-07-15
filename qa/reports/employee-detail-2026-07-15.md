# Employee Detail Page — QA Report

**Date:** 2026-07-15
**Backend:** `http://localhost:8080` (`./gradlew bootRun --args='--spring.profiles.active=dev'`)
**Frontend:** `http://localhost:5173` (`npm run dev`, Vite)
**Driver:** Playwright, `chromium.launch({ channel: 'chrome' })` against real installed Google Chrome
**Auth:** karim@example.com (OWNER), OTP read from backend console log
**Test fixtures used:** Ahmed Ben Ali (id=8, no contract, 0 sessions this month) for the contract-creation
flow (checks 4–7); Em (id=10, 0 sessions this month) for the zero-punches empty state (check 10); Karim
Dupont (id=1) for everything else. Screenshots referenced below are in the scratchpad
(`shots/NN-*.png`) and available on request.

---

## [PASS] Check 1 — Navigate to detail page via employee list
- Expected: Clicking Karim's row on `/employees` loads `/employees/1` with correct name, Owner badge, Active status, device info
- Actual: `h1` = "Karim Dupont", Owner badge present, "Active" status present, device card shows "Bound" (Karim has an ACTIVE Android device in the dev DB)
- Notes: Screenshot `01-employee-detail-karim.png`

## [PASS] Check 2 — "← Employees" navigates back
- Expected: Clicking the back link returns to `/employees`
- Actual: URL after click = `http://localhost:5173/employees`
- Notes: Screenshot `02-back-to-list.png`

## [PASS] Check 3 — Bogus employee id
- Expected: `/employees/99999` shows "Employee not found" state, no crash
- Actual: "Employee not found" text rendered; zero `pageerror` events captured during navigation
- Notes: Screenshot `03-not-found.png`. `EmployeeDetailPage` fetches the full `/api/employees` list and does a client-side `find()` by id — a nonexistent id simply yields `undefined`, hitting the existing `NotFoundState` branch. No dedicated 404 handling needed since there's no per-id fetch.

## [PASS] Check 4 — Employee with no contract
- Expected: "No contract yet" text + "Add contract" button visible
- Actual: Both present, on Ahmed Ben Ali's page (id=8, confirmed via DB query to have zero rows in `contracts` beforehand)
- Notes: Screenshot `04-no-contract.png`

## [PASS] Check 5 — Add first contract (CDI, 20h/week, 12.31€/h, start=today)
- Expected: Card updates immediately, success toast appears
- Actual: Contract card shows `CDI` / `20h/week` / `12.31€/h` / since today's date immediately after submit; "Contract added" toast observed
- Notes: Screenshot `05-contract-added.png`

## [PASS] Check 6 — Add second contract below SMIC (10€/h, start=today+30d)
- Expected: BOTH a success toast AND an amber SMIC warning toast appear
- Actual: "Contract added" toast present; a second toast with text matching `/SMIC/i` present; confirmed its background color resolves to `rgb(254, 243, 199)` = `#FEF3C7` (the amber color hard-coded in `ContractCard.handleCreated`'s warning-toast style), matching the amber-warning styling
- Notes: Screenshot `06-second-contract-warnings.png`

## [PASS] Check 7 — History dates (auto-close verification)
- Expected: Both contracts listed; first contract's end date is exactly one day before the second's start date
- Actual: History shows row 1 "15 Jul 2026 → 13 Aug 2026" and row 2 "14 Aug 2026 → ongoing" — first `endDate` (13 Aug) is exactly one day before second `startDate` (14 Aug), confirming `ContractService.closeCurrentContract`'s `newContractStartDate.minusDays(1)` logic is correctly reflected in the UI's `contractDateLabel` formatting
- Notes: Screenshot `07-history.png`. Dates computed relative to test run date (2026-07-15); today+30d = 2026-08-14, so the close date is 2026-08-13.

## [PASS] Check 8 — "This month" numbers cross-checked against /attendance
- Expected: Session count, total hours, and flagged count on Karim's "This month" card match a manual count from `/attendance` filtered to "Karim Dupont"
- Actual: Detail page chips: **19 sessions**, **10h 12min total**, **2 flagged**. Independent cross-check on `/attendance` (typed "Karim Dupont" into the search box, paged through all filtered results, summed the Duration column and counted rows with a Flagged/Review status badge across all pages): **19 sessions** (matches the "Showing X–Y of 19 sessions" pagination footer), **612 minutes summed = 10h 12min**, **2 flagged rows**. All three match exactly.
- Notes: Screenshot `08b-attendance-search-karim-fixed.png`. **Process note:** the first automated pass of this check mis-mapped the attendance table's column indices (read the Clock Out/Method columns instead of Duration/Status) and reported summed values of 0 — that was a bug in the verification script itself, not the product. Confirmed the table's actual column order via `thead th` text (`Date, Employee, Clock In, Clock Out, Duration, Method, Status`), fixed the script, and reran; the corrected numbers match exactly, so this check is a genuine PASS.

## [PASS] Check 9 — "View all in Attendance →" link
- Expected: Clicking it lands on `/attendance` with the search box prefilled "Karim Dupont" and results filtered accordingly
- Actual: Link present (only rendered when the month has more than 10 sessions — `RECENT_LIMIT = 10` in `EmployeeDetailPage.tsx`; Karim has 19 this month so it appears), click navigates to `/attendance`, search input value = `"Karim Dupont"`, and every visible row's Employee cell contains "Karim"
- Notes: Screenshot `09-view-all-attendance.png`. Link builds the URL as `/attendance?q=${encodeURIComponent(employee.name)}`; `AttendancePage` seeds its `search` state from `searchParams.get('q')` on mount.

## [PASS] Check 10 — Employee with zero punches this month
- Expected: "No sessions this month" empty state, no crash, no broken chips (e.g. "NaN sessions")
- Actual: Empty-state text present, no `NaN` substring anywhere in the page body, zero `pageerror` events
- Notes: Screenshot `10-zero-punches.png`. Employee = Em (id=10), confirmed via DB query to have no `sessions` rows for July 2026.

## [PASS] Check 11 — Mobile 375px layout
- Expected: Detail page cards stack to a single column, nothing overflows horizontally
- Actual: "Personal information" and "Device" card headers share the same x-offset (49px) with "Device" positioned below "Personal information" (y=440.5 vs y=173) — confirming the `grid-cols-1 md:grid-cols-2` layout collapsed to one column below the `md` breakpoint. `document.documentElement.scrollWidth` (375) equals `clientWidth` (375) — no horizontal overflow.
- Notes: Screenshot `11-mobile-375.png`

---

## Summary

| Total | Passed | Failed | Blockers |
|---|---|---|---|
| 11 | 11 | 0 | 0 |

All 11 checks pass. No frontend bugs found in the Employee Detail Page feature: navigation, not-found
handling, the empty-contract state, contract creation (including the SMIC warning toast added in the
recent backend fix), the auto-close history rendering, the "This month" attendance summary (verified to
match an independently computed cross-check), the "View all in Attendance" deep link, the zero-sessions
empty state, and the mobile responsive layout all behaved as specified.
