# Navigation Map

> **Auto-generated** by `docs/extractors/navigation-map.js`.
> Generated at 2026-08-14T22:26:54.001Z
> Maps the Expo Router file structure to the underlying feature components.

## 🗺️ Route Tree

```
app/
├── (auth)/
│   ├── callback.tsx → AuthCallbackScreen (@/src/features/auth)
│   └── login.tsx → AuthScreen (@/src/features/auth)
├── (main)/
│   ├── (tabs)/
│   │   ├── (learn)/
│   │   │   ├── module/
│   │   │   │   └── :id.tsx → ModuleScreen (@/src/features/learn)
│   │   │   ├── subject/
│   │   │   │   └── :id.tsx → SubjectScreen (@/src/features/learn)
│   │   │   ├── year/
│   │   │   │   └── :id.tsx → YearScreen (@/src/features/learn)
│   │   │   ├── _layout.tsx → Stack navigator
│   │   │   └── index.tsx → LearnScreen (@/src/features/learn)
│   │   ├── _layout.tsx → Tabs navigator
│   │   ├── profile.tsx → ProfileScreen (@/src/features/profile)
│   │   └── stats.tsx → StatsScreen (@/src/features/stats)
│   ├── profile/
│   │   └── edit.tsx → EditProfileScreen (@/src/features/profile)
│   ├── purchase/
│   │   └── :moduleId.tsx → PurchaseScreen (@/src/features/purchase)
│   ├── quiz/
│   │   └── :lectureId.tsx → QuizScreen (@/src/features/quiz)
│   └── stats/
│       └── mastery.tsx → MasteryScreen (@/src/features/stats)
├── _layout.tsx → Stack navigator
└── +not-found.tsx → 404 fallback
```

## 🏗️ Layouts (Navigators)

| Path | Type | File | Component |
|------|------|------|-----------|
| `/(main)/(tabs)/(learn)/` | Stack | `artifacts/mobile/app/(main)/(tabs)/(learn)/_layout.tsx` | LearnStack |
| `/(main)/(tabs)/` | Tabs | `artifacts/mobile/app/(main)/(tabs)/_layout.tsx` | TabLayout |
| `/` | Stack | `artifacts/mobile/app/_layout.tsx` | RootLayout |

## 📱 Screens

| Route | Component | Source | Dynamic? |
|-------|-----------|--------|----------|
| `/callback` | AuthCallbackScreen | `@/src/features/auth` |  |
| `/login` | AuthScreen | `@/src/features/auth` |  |
| `/module/[id]` | ModuleScreen | `@/src/features/learn` | ✅ |
| `/subject/[id]` | SubjectScreen | `@/src/features/learn` | ✅ |
| `/year/[id]` | YearScreen | `@/src/features/learn` | ✅ |
| `/` | LearnScreen | `@/src/features/learn` |  |
| `/profile` | ProfileScreen | `@/src/features/profile` |  |
| `/stats` | StatsScreen | `@/src/features/stats` |  |
| `/profile/edit` | EditProfileScreen | `@/src/features/profile` |  |
| `/purchase/[moduleId]` | PurchaseScreen | `@/src/features/purchase` | ✅ |
| `/quiz/[lectureId]` | QuizScreen | `@/src/features/quiz` | ✅ |
| `/stats/mastery` | MasteryScreen | `@/src/features/stats` |  |

## 📊 Summary

- **3** layout navigators
- **12** screen routes
- **5** dynamic routes

