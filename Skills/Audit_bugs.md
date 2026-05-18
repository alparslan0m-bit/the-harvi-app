---
name: harvi-bug-audit
description: >
  Honest, surgical bug audit for the Harvi React Native / Expo / Supabase app.
  Trigger this skill whenever the user asks to audit, review, find bugs, check for issues,
  or scan the codebase for real problems. Also trigger for phrases like "what's broken",
  "is this correct", "check my code", "find issues", "review this hook/screen/function",
  or "why is X not working". This skill enforces brutal honesty — no invented problems,
  no over-engineering recommendations, only real, reproducible bugs that would break the app
  or cause silent data loss for a real user.
---

# Harvi Bug Audit Skill

You are auditing a production React Native / Expo app called **Harvi** — a medical quiz platform.

**Your only job: find real bugs. Nothing else.**

---

## Stack Context

| Layer      | Technology                                             |
| ---------- | ------------------------------------------------------ |
| Mobile     | React Native 0.81, Expo 54, Expo Router                |
| Language   | TypeScript (strict)                                    |
| State      | React Query v5 (`networkMode: "offlineFirst"`)         |
| Backend    | Supabase (Postgres + RLS + Edge Functions)             |
| Auth       | Supabase Auth + Google OAuth via expo-web-browser      |
| Offline    | AsyncStorage cache + offline queue (`offlineQueue.ts`) |
| Payments   | Stripe via Supabase Edge Function                      |
| Animations | react-native-reanimated v4                             |
| Crypto     | Custom XOR + base64 (answer encryption in `crypto.ts`) |

---

## The Only Thing That Matters

A bug is something that:

1. **Breaks** — crashes, throws, renders wrong, loses data
2. **Silently corrupts** — wrong value stored, wrong answer marked correct, wrong user sees data
3. **Causes a security hole** — user accesses data they shouldn't, payment bypassed
4. **Causes data loss** — quiz result not saved, offline queue dropped

A bug is NOT:

- Code style you'd write differently
- Abstractions you'd prefer
- Performance micro-optimizations with no measurable impact
- Missing features
- "Consider extracting this into a hook"
- Anything prefixed with "you could" or "it might be cleaner"

---

## Audit Process

### Step 1 — Understand the scope

Before scanning, ask yourself:

- Did the user point at a specific file, hook, screen, or flow? → Start there.
- Did the user say "audit everything"? → Work through the critical paths below in order.
- Did the user describe a symptom ("answers are wrong", "quiz results lost")? → Trace that exact data flow.

### Step 2 — Critical paths to audit (in priority order)

**1. Answer correctness (highest stakes)**

- `lib/crypto.ts` — three decryption paths, fallback chain
- `hooks/useQuiz.ts` — `resolveAnswerIndex`, `buildSecure`, `shuffleOptions`
- `hooks/useQuizSession.ts` — `handleSelect`, `decryptAnswer` call

Ask: Could a correct answer ever be marked wrong, or vice versa? Trace the index through shuffle → encrypt → decrypt → compare.

**2. Offline queue / data loss**

- `lib/offlineQueue.ts` — enqueue, removeSynced, retry logic
- `hooks/useSyncSession.ts` — flush loop, error handling
- `hooks/useQuizSession.ts` — offline branch in `handleNext`

Ask: If the insert fails mid-flush, is the item re-queued or silently dropped? What happens on partial flush?

**3. RLS / security**

- `supabase/migrations/20260510000001_unified_rls_policies.sql`
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/payment-webhook/index.ts`
- `supabase/functions/verify-purchase/index.ts`

Ask: Can a user read another user's quiz results? Can someone bypass payment by posting directly to the webhook in dev mode?

**4. Auth state / navigation**

- `context/AuthContext.tsx` — session handling, deep link parsing
- `hooks/useLearnFlow.ts` — auth guard
- `app/_layout.tsx` — provider nesting

Ask: Can the app render protected screens before auth is confirmed? Can the session be set with a crafted deep link?

**5. Progress / completion tracking**

- `hooks/useProgress.ts` — `optimisticallyMarkComplete`, cache merge
- `hooks/useQuizSession.ts` — where `invalidateQueries` fires

Ask: Can a lecture be marked complete without a quiz result actually being saved?

**6. React Query cache coherence**

- Stale `initialData` patterns across hooks
- `memCache` module-level maps that survive re-renders

Ask: Can a user see another user's cached data after logout/login?

---

## How to Report Bugs

For each real bug found, use exactly this format:

```
### [SEVERITY] Short title

**File:** `path/to/file.ts` (line ~N)
**What happens:** Concrete description of the broken behavior a user would experience.
**Why it breaks:** The specific code path or logic error.
**Reproduce:** Steps or conditions that trigger it.
**Fix:** The minimum change that resolves it. Code snippet if needed.
```

**Severity levels:**

- `[CRITICAL]` — data loss, security hole, payment bypass, wrong answer recorded
- `[HIGH]` — crash, auth bypass, feature completely broken for a real scenario
- `[MEDIUM]` — silent wrong behavior, edge case data corruption
- `[LOW]` — real bug but rare or low impact

---

## What NOT to Report

Do not report these — they are not bugs in this codebase:

- "Consider using `useCallback` here" (the React Compiler is enabled — it handles this)
- "This component re-renders too often" (without a measured regression)
- "You should add error boundaries" (they already exist in `ErrorBoundary.tsx`)
- "Magic numbers should be constants" (style, not a bug)
- "Missing loading states" (unless it causes a crash or wrong data)
- "This function is too long" (not a bug)
- TypeScript `any` usage (intentional in several hooks for schema detection)
- The XOR encryption being "weak" (it's intentional obfuscation, not cryptographic security)

---

## Known Intentional Patterns (don't flag these)

| Pattern                                                 | Why it's intentional                                              |
| ------------------------------------------------------- | ----------------------------------------------------------------- |
| Multiple FK column candidates (`LECTURE_FK_CANDIDATES`) | Schema-agnostic adapter — works with any Supabase table structure |
| `skipLibCheck: true` in tsconfig                        | Expo ecosystem requirement                                        |
| `answer === -1` fallback in decrypt                     | Graceful degradation when `secure` field is malformed             |
| Module-level `memCache` Maps                            | Intentional cross-render cache, cleared on app restart            |
| `__DEV__` console.error calls                           | Dev-only logging, stripped in production by babel plugin          |
| `(error as any)` in Edge Functions                      | Deno + Supabase type limitations                                  |
| `networkMode: "offlineFirst"` with `retry: 0`           | Intentional — offline queue handles retries                       |
| Dev auto-activation in `create-checkout`                | Gated by `ENVIRONMENT === "development"` check                    |

---

## Audit Output Structure

End your audit with:

```
## Summary

| Severity | Count |
|---|---|
| CRITICAL | N |
| HIGH | N |
| MEDIUM | N |
| LOW | N |

**Total real bugs found: N**

Files audited: [list]
Files skipped (out of scope): [list if any]
```

If you find zero bugs in a file or flow, say so explicitly: "No bugs found in X."

Do not pad the report. A clean audit with 2 real bugs is better than a padded one with 10 fake issues.
