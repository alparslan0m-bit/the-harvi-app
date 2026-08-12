# Navigation Map

> **Auto-generated** by `docs/extractors/navigation-map.js`.
> Complete Expo Router navigation tree derived from the `app/` directory.

## 🗺️ Route Tree

```
app/
├── (auth)/
│   ├── callback.tsx
│   └── login.tsx
├── (main)/
│   ├── (tabs)/
│   │   ├── (learn)/
│   │   │   ├── module/
│   │   │   │   └── :id.tsx
│   │   │   ├── subject/
│   │   │   │   └── :id.tsx
│   │   │   ├── year/
│   │   │   │   └── :id.tsx
│   │   │   ├── _layout.tsx → Stack navigator
│   │   │   └── index.tsx
│   │   ├── _layout.tsx → Tabs navigator
│   │   ├── profile.tsx
│   │   └── stats.tsx
│   ├── profile/
│   │   └── edit.tsx
│   ├── purchase/
│   │   └── :moduleId.tsx
│   ├── quiz/
│   │   └── :lectureId.tsx
│   └── stats/
│       └── mastery.tsx
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
| `/callback` | — | `—` |  |
| `/login` | — | `—` |  |
| `/module/[id]` | — | `—` | ✅ |
| `/subject/[id]` | — | `—` | ✅ |
| `/year/[id]` | — | `—` | ✅ |
| `/` | — | `—` |  |
| `/profile` | — | `—` |  |
| `/stats` | — | `—` |  |
| `/profile/edit` | — | `—` |  |
| `/purchase/[moduleId]` | — | `—` | ✅ |
| `/quiz/[lectureId]` | — | `—` | ✅ |
| `/stats/mastery` | — | `—` |  |

## 📊 Summary

- **3** layout navigators
- **12** screen routes
- **5** dynamic routes

