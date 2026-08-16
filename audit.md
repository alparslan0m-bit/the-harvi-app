# 🔍 Audit: Harvi Recent Implementation (WALKTHROUGH.md)

**Date:** 2026-08-15
**Scope:** All 8 changes documented in `WALKTHROUGH.md`
**Method:** Read every target file plus supporting code (offline queue, purchase store, migrations). No runtime tests executed.

---

## ✅ Verdict Summary

All 8 changes claimed in `WALKTHROUGH.md` are **present in the code**. 7 are sound and correct. 1 (record-iap) has a **fail-open security flaw** and one dead-code condition.

| # | Change | Severity | Verdict |
| :- | :--- | :--- | :--- |
| 2 | Paywall bypass / server-side receipt validation | P0 | ⚠️ **Correct but fail-open** — see Finding 1 |
| 3 | Silent data loss in offline sync | P0 | ✅ Correct, high impact |
| 4 | OAuth PKCE dual-exchange race | P0 | ✅ Correct |
| 5 | 6-candidate waterfall query | P1 | ✅ Correct, real perf win |
| 6 | SecureStore keychain orphan cleanup | P1 | ✅ Correct |
| 7 | Dynamic safe area inset on banner | P2 | ✅ Correct |
| 8 | Accessibility / OS motion preference | P2 | ✅ Correct |
| 9 | Deno / edge function tooling | Tooling | ✅ Correct |

---

## ✅ Verified Correct Changes (Impact Assessment)

### P0 — Offline Sync Data Loss (`syncStore.tsx:132`)
- **Fix:** Only error code `23505` triggers local queue deletion; `42501` (expired JWT / RLS) and `22P02` preserve the queue and back off 30s.
- **Impact:** **Highest-impact change.** Eliminates silent, permanent deletion of students' quiz scores when the auth token expires mid-flush. The old code treated RLS violations as "duplicate rows" and removed them locally.

### P0 — OAuth PKCE Race (`authStore.tsx:209-238`)
- **Fix:** In-memory `exchangedCodes` Set + `session` guard prevent double exchange of single-use PKCE codes.
- **Impact:** Removes intermittent Google login failures on physical devices.
- **Cross-check passed:** Edge function queries RevenueCat by `/subscribers/{user.id}` and the app maps the same ID via `Purchases.logIn(user.id)` (`purchaseStore.tsx:261`).

### P1 — 6-Query Waterfall (`progressService.ts:151`)
- **Fix:** Replaced `FK_CANDIDATES` guessing loop with a single direct `lecture_id` query.
- **Impact:** Removes 5 redundant network requests + 5 Postgres `42703` errors per progress fetch for every user. Real performance and log-noise win. Column confirmed in `20260401000000_harvi_master_baseline.sql`.

### P1 — Keychain Chunk Orphan Cleanup (`supabase.ts:74-99`)
- **Fix:** Cleans stale `.__chunk_N` / `.__count` keys on chunk→unchunk and shrink transitions.
- **Impact:** Stops unbounded iOS Keychain growth over months of token changes. Hygiene; no user-facing change.

### P2 — Safe Area Banner (`OfflineBanner.tsx:42`) & ReduceMotion (`_layout.tsx:101`)
- **Impact:** Fixes banner overlap on Dynamic Island / tall status bars; respects OS "Reduce Motion". Both small, correct UX/a11y wins.

### Tooling — Deno config
- **Impact:** `.vscode/settings.json` + `deno.json` confine Deno LSP to `supabase/functions/`. Correct DX fix.

---

## ⚠️ Findings

### Finding 1 — record-iap is FAIL-OPEN (P0 blocker)

**Location:** `supabase/functions/record-iap/index.ts:129`

```typescript
const rcApiKey = Deno.env.get("REVENUECAT_API_KEY");
if (rcApiKey) { ... validation ... } else {
  console.warn("[RecordIAP] REVENUECAT_API_KEY not configured. Running without server-side receipt validation.");
}
```

If `REVENUECAT_API_KEY` is **not set** in the edge function environment, the function skips validation entirely and records the purchase — the original paywall bypass remains **wide open**, and the client receives a `200` so nothing signals the problem.

- **Action required:** Confirm the secret is deployed in all production edge function environments.
- **Recommendation:** Fail **closed**. If the key is absent, return `500`/`503` instead of proceeding unvalidated.

### Finding 2 — `hasMatchingEntitlement` is dead code (low)

**Location:** `record-iap/index.ts:169`

```typescript
const hasMatchingEntitlement = Object.values(entitlements).some(
  (ent: any) => ent?.product_identifier === transaction_id,
);
```

Compares a **product identifier** against a **transaction id** — never matches. Harmless (OR'd, only adds matches) but misleading, and it provides zero protection against entitlement spoofing. The non-subscription matching is the part that actually works.

- **Recommendation:** Remove it, or match on the transaction id embedded in the entitlement's purchase history if entitlement-granted access is a real flow.

---

## 🟡 Secondary Risks (not blockers)

1. **Availability risk on RevenueCat outage** (`record-iap/index.ts:142`): Any non-2xx from the RC API → `403` → a user who has *paid* cannot unlock their purchase, and record-iap does not retry. Security-first trade-off; consider a retry on the client.
2. **Sync queue wedge** (`syncStore.tsx:136`): A permanently-rejected row (non-23505, e.g. a future schema violation) is preserved forever and, via `break`, blocks every item behind it behind a 30s backoff. No data loss, but the queue can stall. The `isLegacy` guard covers the known `22P02` case.
3. **Double-decode of OAuth code** (`authStore.tsx:218`): `parseOAuthUrl` already URL-decodes via `URLSearchParams`; `decodeURIComponent` is a second decode. No-op for base64url PKCE codes, so harmless in practice.

---

## 📌 Housekeeping

- **Nothing is committed.** `git status` shows all 7 files modified and `WALKTHROUGH.md`, `deno.json`, `.vscode/` untracked.
- **No regression tests** were added for any of the fixes (per the walkthrough, only typecheck + `graph:verify` were run). Consider:
  - A unit test for the sync duplicate-detection branch.
  - A test for the SecureStore chunk-cleanup transitions.

---

## 🎯 Bottom Line

Two genuinely high-impact bug fixes (data loss, paywall bypass), two solid perf/reliability wins, and the rest good hygiene — but the paywall fix is **not done** until the fail-open branch is closed and `REVENUECAT_API_KEY` is confirmed in production.