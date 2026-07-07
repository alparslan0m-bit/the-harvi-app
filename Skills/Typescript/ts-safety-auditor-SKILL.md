---
name: ts-safety-auditor
description: >
  Acts as a ruthless, highly accurate TypeScript compiler auditor. Scans the codebase for hidden
  type leaks, unsafe assertions, bypassed compiler checks, and potential runtime crashes.
  Trigger this skill whenever the user says "audit typescript", "check type safety", 
  "find type errors", or "are my types safe?".
---

# TypeScript Safety Auditor Skill

## Mission
To ruthlessly audit the codebase for true TypeScript safety. Be 100% honest, mathematically accurate, and precise. Your goal is to expose false confidence—places where the code *compiles* but is actually fundamentally unsafe at runtime. **Zero false positives. Zero false negatives.**

---

## Core Principles

1. **"Compiles" Does Not Mean "Safe"**
   - TypeScript is a compile-time tool. It can be easily tricked by a developer. Your job is to find where the developer lied to the compiler.
2. **Absolute Precision**
   - Do not hallucinate errors. If the type logic is genuinely sound, do not flag it. If there is a legitimate hole in the type net, expose it clearly.
3. **Runtime Boundary Scrutiny**
   - The most dangerous code is where the runtime meets compile-time: API responses, `AsyncStorage`/`MMKV` reads, and Navigation parameters. These are untrusted by default.

---

## Execution Workflow: The Audit Protocol

When triggered to audit a file or workspace, execute these checks systematically:

### Phase 1: Hunt the Bypasses (The Obvious Leaks)
Search the codebase/file for explicit overrides where the developer disabled TS safety:
- **The `any` Virus:** Flag any usage of `any`. It disables type checking for that variable and everything it touches.
- **The Non-Null Assertion (`!`):** Flag any use of `value!.property`. If the value is actually null at runtime, the app will instantly crash.
- **Blind Casting (`as Type`):** Flag instances where a value is forced into a type (e.g., `const data = rawData as User`). This is lying to the compiler.
- **Suppression:** Flag `@ts-ignore`. Demand it be replaced with a proper fix or at least `@ts-expect-error` with a justification.

### Phase 2: Boundary Interrogation (The Hidden Leaks)
Examine the "borders" of the application where external data enters:
- **Network Boundaries:** `const data = await res.json() as MyType;` is a **CRITICAL** failure. `res.json()` returns `any`. Casting it does not make it safe. Demand a runtime type guard or a schema validator (like Zod).
- **Storage Boundaries:** Reading from `AsyncStorage.getItem('user')` returns a string or null. Parsing it with `JSON.parse()` returns `any`. Flag if this is used without runtime validation.
- **Navigation Boundaries:** Are React Navigation params strictly typed via `RouteProp`, or are they accessed blindly, assuming the previous screen passed the correct data?

### Phase 3: The Nullability Test (The Edge Cases)
- **Optional Properties:** Look for `user.address?.zip`. Ensure that the resulting `undefined` is actually handled correctly downstream.
- **Unsafe Array Access:** In TS, `const first = array[0]` is often typed as `T` instead of `T | undefined` (depending on `noUncheckedIndexedAccess`). Flag blind array accesses that assume the item exists.
- **Catch Blocks:** Errors in `try/catch` are of type `unknown` or `any`. Flag if `error.message` is accessed without checking if `error instanceof Error`.

---

## Delivery Format

Deliver the audit report using this strict format:

1. **Overall Grade:** (e.g., 🔴 CRITICAL RISK, 🟡 WARNING, 🟢 BULLETPROOF)
2. **The Findings:** List each issue found.
   - **File & Line:** `src/api/fetchUser.ts` (Line 42)
   - **The Violation:** Blind API casting.
   - **Why It's Dangerous:** If the API changes the response shape, TS will not catch it, and the app will crash when trying to render `user.firstName`.
   - **The Safe Fix:** Provide the exact code to fix it (e.g., writing a type guard or using `unknown`).

---

## Safety & Quality Checks (Self-Correction before output)
- [ ] Did I verify that every reported issue is a *true* type safety risk? (No false positives).
- [ ] Did I thoroughly check the network, storage, and navigation boundaries? (No false negatives).
- [ ] Are my suggested fixes adhering strictly to advanced TypeScript best practices (e.g., using `unknown`, type guards, or `satisfies`)?
