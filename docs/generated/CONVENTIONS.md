# Conventions

> **Auto-generated** by `docs/extractors/conventions.js`.
> Generated at 2026-08-17T10:59:13.948Z
> Structural patterns extracted from the codebase. Follow these when adding new code.

## 📁 Feature Folder Structure

Each feature in `src/features/` follows this structure:

```
src/features/{feature}/
├── components/
├── constants/
├── hooks/
├── services/
├── types/
├── utils/
└── index.ts (barrel export)
```

| Feature | Subdirectories | Root Files |
|---------|----------------|------------|
| **auth** | components, constants, hooks, services, types, utils | index.ts |
| **learn** | components, constants, hooks, services, types, utils | index.ts |
| **profile** | components, constants, hooks, services, types, utils | index.ts |
| **purchase** | components, constants, hooks, services, types, utils | index.ts |
| **quiz** | components, constants, hooks, services, types, utils | index.ts |
| **stats** | components, constants, hooks, services, types, utils | index.ts |

## 🐚 Thin Shell Pattern (Route Files)

Route files in `app/` must only re-export from `src/features/`. No logic allowed.

- ✅ **12** route files follow the thin shell pattern

## 🏪 Store Pattern (Zustand)

Every store follows: **Zustand create** + **Provider component** + **useXxx hook**

| Store | Zustand | Provider | Hook | AsyncStorage | Supabase | QueryClient |
|-------|---------|----------|------|-------------|----------|-------------|
| `authStore` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `cacheStore` | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `purchaseStore` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `syncStore` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `themeStore` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |

## ⚙️ Service Pattern

Services use a three-tier cache strategy: **memCache → AsyncStorage → Supabase**

| Service | Mem Cache | AsyncStorage | Supabase | Offline Check | Full 3-Tier |
|---------|-----------|-------------|----------|---------------|-------------|
| `accessService` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `bestScoreService` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `hierarchyService` | ❌ | ❌ | ✅ | ✅ | ❌ |
| `progressService` | ✅ | ❌ | ❌ | ✅ | ❌ |
| `questionCache` | ❌ | ❌ | ❌ | ❌ | ❌ |
| `questionService` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `statsService` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `offlineQueue` | ❌ | ❌ | ❌ | ❌ | ❌ |

## 📦 Import Conventions

- **Alias imports (`@/`):** 300 usages across 153 files
- **Relative imports (`./`):** 194 usages
- **Convention:** Use `@/` for cross-feature imports, `./` for intra-directory

### ⚠️ Cross-Feature Import Violations

Features should not import directly from other features. Use `shared/` instead.

| File | Imports From Feature |
|------|---------------------|
| `artifacts/mobile/src/features/learn/hooks/useSubjectCache.ts` | quiz |
| `artifacts/mobile/src/features/learn/hooks/useSubjectCache.ts` | quiz |
| `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | stats |
| `artifacts/mobile/src/features/profile/components/AccountActions.tsx` | quiz |
| `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | learn |
| `artifacts/mobile/src/features/quiz/hooks/useQuizSession.ts` | learn |
| `artifacts/mobile/src/features/stats/components/MasteryFilterChips.tsx` | learn |
| `artifacts/mobile/src/features/stats/components/MasteryScreen.tsx` | learn |
| `artifacts/mobile/src/features/stats/services/statsService.ts` | learn |

