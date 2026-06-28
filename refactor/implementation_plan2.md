# Harvi Mobile App — Codebase Refactoring Plan

Following the [rn-expo-refactor skill](file:///c:/Users/METRO/harvi%20gamed/Skills/rn-expo-refactor-SKILL.md), this plan restructures the working codebase into a professional, readable, team-friendly project — **without changing any behavior**.

## Current State Assessment

The codebase is already **partially well-organized** — screens are thin, hooks extract logic, components are in domain folders, barrel exports exist. However, several issues hurt readability and business clarity:

### What's Already Good ✅
- Screens are thin (delegating to hooks/components)
- Components are grouped by domain (`learn/`, `quiz/`, `stats/`, `profile/`)
- Barrel exports exist for components
- Types are centralized in `/types`
- Custom hooks extract stateful logic

### What Needs Fixing 🔧

| Problem | Where | Skill Phase |
|---------|-------|-------------|
| `context/` folder at root — should be `store/` per skill convention | `/context/` | Phase 1 |
| `lib/` folder mixes services + utilities — unclear boundary | `/lib/` | Phase 1, 4 |
| No `services/` layer — Supabase calls scattered in hooks | hooks, lib | Phase 4 |
| No constants barrel export (`index.ts`) | `/constants/` | Phase 5, 9 |
| No hooks barrel export (`index.ts`) | `/hooks/` | Phase 9 |
| No utils barrel export (`index.ts`) | `/utils/` | Phase 9 |
| `useQuiz.ts` is 354 lines — mixes DB schema detection, answer resolution, encryption, shuffling, and the hook itself | `/hooks/useQuiz.ts` | Phase 2, 3, 4 |
| `useStats.ts` is 385 lines — mixes caching, computation, fetching | `/hooks/useStats.ts` | Phase 3, 4 |
| `useProgress.ts` is 224 lines — mixes caching, fetching, queue merging | `/hooks/useProgress.ts` | Phase 3, 4 |
| `crypto.ts` has bare `console.log` statements (not `__DEV__` guarded) | `/lib/crypto.ts` | Phase 8 |
| `useQuiz.ts` has bare `console.log` statements | `/hooks/useQuiz.ts` | Phase 8 |
| `quizHelpers.ts` in `/utils/` has unused import (`Feather`) | `/utils/quizHelpers.ts` | Phase 8 |
| Junk files at root (`cd`, `npx`, `output.txt`) | `/` | Cleanup |
| `answered` dependency missing from `useCallback` in `useQuizSession.ts` | `/hooks/useQuizSession.ts` | Phase 8 |
| No `services/` folder for API calls | — | Phase 4 |

---

## Proposed Changes

### Phase 1 — Folder Structure Rename

> [!IMPORTANT]
> Renaming `context/` to `store/` is the **biggest structural change** and is **optional**. The skill calls this out as the convention, but the existing `context/` name is clear and used consistently. I recommend **keeping `context/`** to minimize import churn, unless you prefer the `store/` convention.

#### [NEW] `constants/index.ts` — Barrel export
Add barrel export so imports can be `from '@/constants'`.

#### [NEW] `hooks/index.ts` — Barrel export  
Add barrel export for all 20 hooks.

#### [NEW] `utils/index.ts` — Replace current file with barrel export

#### [NEW] `services/` — API service layer
Create `services/` directory with:
- `services/api.ts` — Supabase RPC/query wrappers extracted from hooks
- `services/index.ts` — Barrel export

#### [DELETE] Junk files
- `cd` (0 bytes, junk)
- `npx` (0 bytes, junk)  
- `output.txt` (debug output)

---

### Phase 2 — Extract `useQuiz.ts` (354 lines → 3 focused files)

This is the **highest-impact change** for readability. `useQuiz.ts` currently does 5 unrelated jobs in one file.

#### [NEW] `services/questionService.ts`
Extract the Supabase fetch logic (`fetchQuestions`) — the schema detection, DB querying, and data mapping. ~80 lines.

#### [NEW] `utils/answerResolver.ts`
Extract `resolveAnswerIndex`, `buildSecure`, `shuffleOptions`, `parseOptions`, `extractOptionText`, and all the `*_CANDIDATES` constants. ~150 lines. This is pure business logic with zero React dependencies.

#### [MODIFY] `hooks/useQuiz.ts`
Slim down to just the React Query hook (~30 lines) that imports from the service and utils.

---

### Phase 3 — Extract service functions from data hooks

#### [NEW] `services/statsService.ts`
Extract from [useStats.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useStats.ts):
- `fetchStats()` 
- `computeStats()`
- `buildLectureNameMap()`
- `serveFromCache()` / `readCache()` / `writeCache()` / `warmMemCache()`
- All constants (`DAYS`, `ZERO_STATS`, `RawRow`, `DbStats`)

The hook file keeps only `useStats()` + `clearStatsCache()` (~40 lines).

#### [NEW] `services/progressService.ts`
Extract from [useProgress.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useProgress.ts):
- `fetchCompletedLectures()`
- `serveFromCache()`
- Cache read/write helpers
- `optimisticallyMarkComplete()` (stays exported)

The hook file keeps only `useProgress()` + `useRefreshProgress()` + `clearProgressCache()` (~40 lines).

#### [NEW] `services/hierarchyService.ts`
Extract from [useHierarchy.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useHierarchy.ts):
- `buildHierarchyFromRemote()`
- `fetchHierarchy()`  
- `detectFK()`
- Cache helpers

The hook file keeps only `useHierarchy()` (~15 lines).

#### [NEW] `services/accessService.ts`
Extract from [useModuleAccess.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useModuleAccess.ts):
- `fetchContentAccess()`
- Cache helpers

The hook file keeps only `useModuleAccess()` (~15 lines).

---

### Phase 4 — `__DEV__` guard all console statements

#### [MODIFY] `lib/crypto.ts`
Wrap 3 `console.log` calls and 1 `console.error` in `__DEV__` guards.

#### [MODIFY] `hooks/useQuiz.ts` (after extraction)
Already cleaned by extraction — remaining `console.log` in service file will be guarded.

#### [MODIFY] `services/questionService.ts` (new file)
All `console.log`/`console.error` wrapped in `__DEV__`.

---

### Phase 5 — Code Quality Fixes (Phase 8 of skill)

#### [MODIFY] `utils/quizHelpers.ts`
Remove unused `Feather` import (only `React.ComponentProps<typeof Feather>` is used as a type — can use `import type`).

#### [MODIFY] `services/questionService.ts`
The duplicated `XOR_KEY` constant exists in both `crypto.ts` and `useQuiz.ts` — consolidate to a single source of truth in `crypto.ts`.

---

### Phase 6 — Barrel Exports (Phase 9 of skill)

#### [NEW] `constants/index.ts`
```ts
export { default as colors } from './colors';
export * from './storage';
```

#### [NEW] `hooks/index.ts`
```ts
export { useAuthForm } from './useAuthForm';
export { useColors } from './useColors';
// ... all 20 hooks
```

#### [MODIFY] `utils/index.ts` — Currently only has `quizHelpers.ts`, will also export `answerResolver.ts`

#### [NEW] `services/index.ts`
```ts
export * from './questionService';
export * from './statsService';
export * from './progressService';
export * from './hierarchyService';
export * from './accessService';
```

---

## Open Questions

> [!IMPORTANT]
> **Rename `context/` → `store/`?** The skill recommends `store/` for state management. Your current naming is `context/` which is also perfectly clear. Renaming would touch ~15 import statements across the app. **My recommendation: keep `context/`** to minimize churn, since the name is already descriptive and consistent.

> [!IMPORTANT]
> **Rename `lib/` → distribute into `services/` + `utils/`?** Currently `lib/` contains:
> - `supabase.ts` — fits in `services/` (external SDK init)
> - `crypto.ts` — fits in `utils/` (pure functions)
> - `questionCache.ts` — fits in `services/` (AsyncStorage I/O)
> - `offlineQueue.ts` — fits in `services/` (AsyncStorage I/O)
>
> **My recommendation: keep `lib/`** as-is for infrastructure code (Supabase client, crypto, storage abstractions) and use `services/` only for the new business-logic service files. This avoids breaking every import path to `@/lib/supabase`.

---

## Safety Checklist

- ✅ No function behavior changes — only file moves and extractions
- ✅ No API call changes — same Supabase queries, same parameters
- ✅ No navigation route changes — all routes untouched
- ✅ No state shape changes — same hooks return same values
- ✅ No UI output changes — zero JSX modifications

---

## Verification Plan

### Automated Tests
```bash
cd artifacts/mobile && npx tsc --noEmit
```
TypeScript compilation confirms all imports resolve and types match after the refactor.

### Manual Verification
- All barrel exports verified by checking that existing import paths still resolve
- Every file that moves logic out is checked to confirm the hook/screen returns the exact same API surface
- `git diff` review to confirm zero behavior changes

---

## Summary of New File Tree

```
artifacts/mobile/
  services/                      ← NEW: Business logic layer
    questionService.ts           ← Extracted from useQuiz.ts
    statsService.ts              ← Extracted from useStats.ts
    progressService.ts           ← Extracted from useProgress.ts
    hierarchyService.ts          ← Extracted from useHierarchy.ts
    accessService.ts             ← Extracted from useModuleAccess.ts
    index.ts                     ← Barrel export
  utils/
    quizHelpers.ts               ← Cleaned (unused import removed)
    answerResolver.ts            ← NEW: Extracted from useQuiz.ts
    index.ts                     ← NEW: Barrel export (replaces old file)
  hooks/
    index.ts                     ← NEW: Barrel export
    useQuiz.ts                   ← Slimmed (354→~30 lines)
    useStats.ts                  ← Slimmed (385→~40 lines)
    useProgress.ts               ← Slimmed (224→~40 lines)
    useHierarchy.ts              ← Slimmed (150→~15 lines)
    useModuleAccess.ts           ← Slimmed (78→~15 lines)
    ... (other 15 hooks unchanged)
  constants/
    index.ts                     ← NEW: Barrel export
    colors.ts                    ← Unchanged
    storage.ts                   ← Unchanged
  lib/
    crypto.ts                    ← Modified: __DEV__ guards, export XOR_KEY
    supabase.ts                  ← Unchanged
    questionCache.ts             ← Unchanged
    offlineQueue.ts              ← Unchanged
  context/                       ← Unchanged (keeping name)
  components/                    ← Unchanged
  app/                           ← Unchanged (zero screen changes)
  types/                         ← Unchanged
```

**Estimated files touched: 12 modified, 8 new, 3 deleted**
**Estimated total changes: ~800 lines moved (not new logic)**
