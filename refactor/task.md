# Refactoring Tasks

## Phase 1 — Folder Structure & Cleanup
- [x] Delete junk files (`cd`, `npx`, `output.txt`)
- [x] Create `constants/index.ts` barrel export
- [x] Create `services/` directory with `index.ts`

## Phase 2 — Extract `useQuiz.ts` (354 → ~45 lines)
- [x] Create `utils/answerResolver.ts` (pure business logic)
- [x] Create `services/questionService.ts` (Supabase fetch + mapping)
- [x] Slim `hooks/useQuiz.ts` to just the React Query hook

## Phase 3 — Extract service functions from data hooks
- [x] Create `services/statsService.ts` + slim `useStats.ts`
- [x] Create `services/progressService.ts` + slim `useProgress.ts`
- [x] Create `services/hierarchyService.ts` + slim `useHierarchy.ts`
- [x] Create `services/accessService.ts` + slim `useModuleAccess.ts`

## Phase 4 — `__DEV__` guard console statements
- [x] Guard `lib/crypto.ts` console calls
- [x] Guard `services/questionService.ts` console calls
- [x] Guard `services/statsService.ts` console calls
- [x] Guard `services/progressService.ts` console calls

## Phase 5 — Code Quality Fixes
- [x] Consolidate duplicate `XOR_KEY` constant (now exported from `lib/crypto.ts`)
- [x] Update `services/index.ts` barrel export

## Phase 6 — Barrel Exports
- [x] Create `hooks/index.ts` barrel export
- [x] Create `utils/index.ts` barrel export
- [x] Create `constants/index.ts` barrel export
- [x] Create `services/index.ts` barrel export

## Verification
- [x] TypeScript compilation passes (`npx tsc --noEmit` — zero errors)
