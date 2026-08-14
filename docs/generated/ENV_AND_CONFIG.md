# Environment & Configuration

> **Auto-generated** by `docs/extractors/env-and-config.js`.
> Generated at 2026-08-14T17:41:49.693Z
> Maps required environment variables, Expo plugins, and build profiles.

## 🔐 Environment Variables

| Variable | Used In |
|----------|---------|
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | `purchaseStore.tsx` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `purchaseStore.tsx` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `QuizImage.tsx`, `supabase.ts` |
| `EXPO_PUBLIC_SUPABASE_URL` | `QuizImage.tsx`, `supabase.ts` |

## 📱 App Configuration (`app.json`)

### Core Info
- **Name:** Harvi
- **Slug:** mobile
- **Scheme:** harvi
- **iOS Bundle ID:** com.harvi.app
- **Android Package:** com.harvi.app

### 🔌 Expo Plugins

- `expo-router`
- `expo-font`
- `expo-web-browser`
- `expo-secure-store`

### 🧪 Experiments

```json
{
  "typedRoutes": true,
  "reactCompiler": true
}
```

## 🏗️ EAS Build Profiles (`eas.json`)

| Profile | Distribution | Dev Client | Auto Increment |
|---------|--------------|------------|----------------|
| `development` | internal | ✅ | — |
| `preview` | internal | — | ✅ |
| `production` | — | — | ✅ |

