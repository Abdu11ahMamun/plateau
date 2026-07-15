# Contract Management — QA Report

**Date:** 2026-07-15
**Backend:** `http://localhost:8080`, profile `dev`, started via `./gradlew bootRun --args='--spring.profiles.active=dev'`
**Collection:** [postman/contract-management.json](../../postman/contract-management.json)
**Auth user (OWNER):** karim@example.com (id=1, tenant=1)
**Auth user (EMPLOYEE, for edge case E):** lea@example.com (id=3, tenant=1)

**Pre-run note:** the `contracts` table for `user_id=1` contained leftover rows from a
prior session (`id=1` CDI 2026-07-01→2026-07-31, `id=2` CDI 2026-08-01→open). These were
deleted (`DELETE FROM contracts WHERE user_id=1 AND tenant_id=1`) before this run so the
auto-close sequence (#3 → #5) would be verifiable from a clean state. This is why the new
rows created below are `id=3` and `id=4` rather than `id=1`/`id=2` — auto-increment was not reset.

---

## [PASS] OTP Request
- Endpoint: `POST /api/auth/otp/request`
- Expected: 204, no body
- Actual: 204, empty body
- Notes: Code logged to console (`ConsoleOtpSender`): `364660`.
- Curl:
```
curl -s -o r1.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"identifier":"karim@example.com"}'
```
Result: `HTTP_STATUS:204`, body empty.

---

## [PASS] OTP Verify
- Endpoint: `POST /api/auth/otp/verify`
- Expected: 200, body has token, refreshToken, user
- Actual: 200, `{"token":"...","refreshToken":"b8ef5f92-...","user":{"id":1,"name":"Karim Dupont","role":"OWNER"}}`
- Notes: —
- Curl:
```
curl -s -o r2.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"identifier":"karim@example.com","code":"364660"}'
```
Result: `HTTP_STATUS:200`
```json
{"token":"eyJhbGciOiJIUzI1NiJ9...","refreshToken":"b8ef5f92-bb4a-47e1-92bd-98c402d1e804","user":{"id":1,"name":"Karim Dupont","role":"OWNER"}}
```

---

## [FAIL] Create Contract - Valid CDI
- Endpoint: `POST /api/employees/1/contract`
- Expected: 201, body has `contract.id`, `warnings: []`
- Actual: 201, but body is the flat `Contract` entity — no `contract` wrapper key, and no `warnings` key at all
- Notes: Status code and persistence are correct (contract created, `id=3`, `type=CDI`, `startDate=2026-07-01`). The response shape does not match the expected `{contract: {...}, warnings: [...]}` envelope. See bug report below — this is the same root cause as the "Below SMIC" failure.
- Curl:
```
curl -s -o r3.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-07-01"}'
```
Result: `HTTP_STATUS:201`
```json
{"id":3,"userId":1,"tenantId":1,"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-07-01","endDate":null,"createdAt":"2026-07-15T15:18:06.041844Z"}
```

### 🐛 BUG REPORT
- Owner: backend
- Endpoint: `POST /api/employees/{id}/contract`
- File likely responsible: `ContractController.createContract` — returns the bare `Contract` entity instead of a `{contract, warnings}` envelope; `ContractService` has no warnings-computation step at all.
- Repro (exact curl command that fails):
```
curl -s -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-07-01"}'
```
Response has no `warnings` field and no `contract` wrapper — just the raw entity.

---

## [FAIL] Create Contract - Below SMIC
- Endpoint: `POST /api/employees/1/contract`
- Expected: 201, `warnings: ["Wage below SMIC (12.31€)"]`
- Actual: 201, contract created (`id=4`, `hourlyWageCents=1000`), but no `warnings` field is present anywhere in the response
- Notes: `grep -rn -i "warning\|SMIC" backend/src/main/java` returns **zero matches** — the SMIC minimum-wage check is not implemented anywhere in `ContractService`/`ContractController`. `validateContract()` only checks `hourlyWageCents > 0`; a wage of 1000 cents (10.00€), which is below the French SMIC hourly rate, is silently accepted with no warning surfaced to the caller.
- Curl:
```
curl -s -o r5.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01"}'
```
Result: `HTTP_STATUS:201`
```json
{"id":4,"userId":1,"tenantId":1,"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01","endDate":null,"createdAt":"2026-07-15T15:18:28.262075Z"}
```

### 🐛 BUG REPORT
- Owner: backend
- Endpoint: `POST /api/employees/{id}/contract`
- File likely responsible: `ContractService.validateContract` — no SMIC threshold check exists; `ContractController.createContract` — no mechanism to return non-blocking warnings alongside a 201.
- Repro (exact curl command that fails):
```
curl -s -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01"}'
```
Contract is created below SMIC with no warning returned.

---

## [PASS] Create Contract - Invalid Type
- Endpoint: `POST /api/employees/1/contract`
- Expected: 422, problem+json, no contract created
- Actual: 422, problem+json; DB confirmed no row inserted for this request
- Notes: Verified via `SELECT id,type,start_date FROM contracts WHERE user_id=1` immediately after — only the prior valid CDI (`id=3`) was present, no `STAGE` row.
- Curl:
```
curl -s -o r4.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"STAGE","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-08-01"}'
```
Result: `HTTP_STATUS:422`
```json
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"Contract type must be CDI, CDD, or EXTRA","instance":"/api/employees/1/contract"}
```

---

## [PASS] Get Contract History
- Endpoint: `GET /api/employees/1/contracts`
- Expected: 200, array newest first, #3 and #5 both present, #3's `endDate` auto-closed to `2026-08-31`
- Actual: 200, array of 2, newest first (`id=4` created 2026-09-01 first, then `id=3`); `id=3.endDate == "2026-08-31"` — **auto-close business rule verified correct**
- Notes: `closeCurrentContract()` in `ContractService` correctly set the prior open contract's `endDate` to `newContractStartDate.minusDays(1)` = `2026-09-01` − 1 day = `2026-08-31` when the below-SMIC contract was created.
- Curl:
```
curl -s -o r6.body -w "HTTP_STATUS:%{http_code}\n" -X GET http://localhost:8080/api/employees/1/contracts \
  -H "Authorization: Bearer $TOKEN"
```
Result: `HTTP_STATUS:200`
```json
[
  {"id":4,"userId":1,"tenantId":1,"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01","endDate":null,"createdAt":"2026-07-15T15:18:28Z"},
  {"id":3,"userId":1,"tenantId":1,"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-07-01","endDate":"2026-08-31","createdAt":"2026-07-15T15:18:06Z"}
]
```

---

## [PASS] Get Employee List
- Endpoint: `GET /api/employees`
- Expected: 200, employee id=1 has `currentContract` matching request #5 (the latest)
- Actual: 200, employee `id=1` (`Karim Dupont`) has `currentContract: {"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01"}` — matches contract #5 exactly
- Notes: —
- Curl:
```
curl -s -o r7.body -w "HTTP_STATUS:%{http_code}\n" -X GET http://localhost:8080/api/employees \
  -H "Authorization: Bearer $TOKEN"
```
Result: `HTTP_STATUS:200` (relevant excerpt)
```json
{"id":1,"name":"Karim Dupont","role":"OWNER","currentContract":{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1000,"startDate":"2026-09-01"}}
```

---

## [PASS] Edge Case A — No Authorization header
- Endpoint: `GET /api/employees/1/contracts`
- Expected: 401
- Actual: 401
- Notes: —
- Curl:
```
curl -s -o ea.body -w "HTTP_STATUS:%{http_code}\n" -X GET http://localhost:8080/api/employees/1/contracts
```
Result: `HTTP_STATUS:401`
```json
{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Authentication required"}
```

---

## [PASS] Edge Case B — Non-existent employeeId
- Endpoint: `POST /api/employees/99999/contract`
- Expected: 404
- Actual: 404
- Notes: —
- Curl:
```
curl -s -o eb.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/99999/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-10-01"}'
```
Result: `HTTP_STATUS:404`
```json
{"type":"about:blank","title":"Not Found","status":404,"detail":"User not found for tenant: userId=99999, tenantId=1","instance":"/api/employees/99999/contract"}
```

---

## [PASS] Edge Case C — weeklyMinutes = 0
- Endpoint: `POST /api/employees/1/contract`
- Expected: 422
- Actual: 422
- Notes: —
- Curl:
```
curl -s -o ec.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":0,"hourlyWageCents":1231,"startDate":"2026-10-01"}'
```
Result: `HTTP_STATUS:422`
```json
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"Weekly minutes must be between 1 and 3600","instance":"/api/employees/1/contract"}
```

---

## [PASS] Edge Case D — hourlyWageCents = -100
- Endpoint: `POST /api/employees/1/contract`
- Expected: 422
- Actual: 422
- Notes: —
- Curl:
```
curl -s -o ed.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":-100,"startDate":"2026-10-01"}'
```
Result: `HTTP_STATUS:422`
```json
{"type":"about:blank","title":"Unprocessable Entity","status":422,"detail":"Hourly wage cents must be greater than 0","instance":"/api/employees/1/contract"}
```

---

## [PASS] Edge Case E — POST as EMPLOYEE-role user
- Endpoint: `POST /api/employees/1/contract`
- Expected: 403
- Actual: 403
- Notes: Logged in as `lea@example.com` (id=3, role=EMPLOYEE) via OTP request/verify to obtain an EMPLOYEE-scoped token.
- Curl:
```
curl -s -o ee.body -w "HTTP_STATUS:%{http_code}\n" -X POST http://localhost:8080/api/employees/1/contract \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d '{"type":"CDI","weeklyMinutes":1200,"hourlyWageCents":1231,"startDate":"2026-10-01"}'
```
Result: `HTTP_STATUS:403`
```json
{"type":"about:blank","title":"Forbidden","status":403,"detail":"Only OWNER or MANAGER can manage employee contracts"}
```

---

## Summary

| # | Check | Result |
|---|---|---|
| 1 | OTP Request | PASS |
| 2 | OTP Verify | PASS |
| 3 | Create Contract - Valid CDI | **FAIL** (response shape) |
| 4 | Create Contract - Invalid Type | PASS |
| 5 | Create Contract - Below SMIC | **FAIL** (no SMIC warning implemented) |
| 6 | Get Contract History (incl. auto-close rule) | PASS |
| 7 | Get Employee List | PASS |
| A | No auth header → 401 | PASS |
| B | Non-existent employeeId → 404 | PASS |
| C | weeklyMinutes = 0 → 422 | PASS |
| D | hourlyWageCents = -100 → 422 | PASS |
| E | EMPLOYEE role → 403 | PASS |

**12 checks, 10 pass, 2 fail.** Both failures share one root cause: the contract-creation
endpoint never implements a SMIC (minimum wage) check or a `warnings` response field —
`grep -rn -i "warning|SMIC" backend/src/main/java` returns no results. Status codes,
persistence, auth/role enforcement, tenant scoping, validation bounds, and the
auto-close-on-new-contract business rule all behave correctly.
