---
name: expo-library-catalog
description: >
  A curated catalog of the best React Native / Expo libraries for every use case.
  Use this skill to choose the right library when you need to implement a specific feature.
  Trigger: "which library for", "best library for", "what should I use for",
  "expo libraries", "react native libraries", "library catalog", "tech stack",
  "what package for", "recommend a library", "choose a library".
---

# Expo Library Catalog

## How to Use This Skill

When you need to implement a feature, find the category below and use the **Pick** column.
Each pick has a one-line reason and a "When to use" note so you don't over-engineer.

> **Rule:** Don't install a library for something you can do in 20 lines of code.
> Only reach for a dependency when it solves a genuinely hard problem (animations, gestures, crypto, native APIs).

---

## 📦 Navigation & Routing

| Need | Pick | Why |
|---|---|---|
| File-based routing | `expo-router` | Deep linking, typed routes, web support — all automatic |
| Programmatic navigation | `expo-router` (`useRouter`) | Same lib, use `router.push()` / `router.replace()` |
| Tab bar | Expo Router `(tabs)/_layout.tsx` | Built-in, no extra dep |
| Modal screens | Expo Router `presentation: 'modal'` | Native modal transitions |
| Bottom tab icons | `@expo/vector-icons` | Ships with Expo, 0 install |
| Drawer navigation | `expo-router` + `expo-drawer` (wraps `@react-navigation/drawer`) | File-based drawer routes |
| Deep linking | Expo Router (automatic) | File path = URL path, zero config |

**When NOT to use Expo Router:** Legacy projects locked to React Navigation 6. In that case, stick with `@react-navigation/native` + stack/tabs/drawer packages.

---

## 🗄️ State Management

| Need | Pick | Alt | Why |
|---|---|---|---|
| Global client state | `zustand` | — | 1KB, no providers, no boilerplate, persist middleware, works outside React |
| Server/async state | `@tanstack/react-query` | — | Caching, dedup, background refetch, pagination, infinite scroll |
| Complex server state with realtime | `@tanstack/react-query` + Supabase Realtime | — | Query for fetch, subscription for live updates |
| Form state | `react-hook-form` | — | Uncontrolled = fast, no re-render per keystroke |
| URL/search params state | Expo Router `useLocalSearchParams` | — | Built-in, type-safe |

**Avoid:** Redux (too much boilerplate for mobile), MobX (magic), Jotai/Recoil (atomic model is overkill for most apps).

**Pattern:** Server state → TanStack Query. Client state → Zustand. Form state → React Hook Form. Never mix these.

---

## 💾 Storage & Persistence

| Need | Pick | Why |
|---|---|---|
| General key-value storage | `react-native-mmkv` | 30x faster than AsyncStorage, synchronous, supports encryption |
| Sensitive data (tokens, keys) | `expo-secure-store` | Keychain (iOS) / Keystore (Android), encrypted at OS level |
| Zustand persistence | `zustand/middleware` + MMKV adapter | Persist stores without AsyncStorage |
| Supabase session persistence | MMKV custom adapter | Replace default AsyncStorage adapter |
| SQLite (relational local data) | `expo-sqlite` | Built-in Expo module, sync API, WAL mode |
| Large offline datasets | `expo-sqlite` + `@op-engineering/op-sqlite` | When you need raw perf (10k+ rows) |
| File system | `expo-file-system` | Read/write files, download, upload |
| Image/video cache | `expo-image` (automatic) | Built-in disk cache, no manual management |

**Rule:** MMKV for preferences & small data. SecureStore for secrets. SQLite for structured/relational data. Never use AsyncStorage in new projects.

---

## 🔐 Authentication

| Need | Pick | Why |
|---|---|---|
| Email/password auth | `@supabase/supabase-js` | Built-in auth, RLS, magic links |
| OAuth (Google, Apple, GitHub) | `expo-auth-session` + `expo-web-browser` | Expo-managed OAuth flow, works in dev and prod |
| Apple Sign-In | `expo-apple-authentication` | Native Apple button + credential API |
| Google Sign-In | `expo-auth-session` (AuthRequest) | Standard OAuth, no native module needed |
| Biometric auth (Face ID / fingerprint) | `expo-local-authentication` | Gate sensitive actions behind biometrics |
| Session management | Supabase `onAuthStateChange` + Zustand | Reactive session tracking |

**If using Firebase:** Replace Supabase auth with `@react-native-firebase/auth`. Same patterns apply.

---

## 🎨 UI Components

| Need | Pick | Why |
|---|---|---|
| Custom design system | Build your own with `StyleSheet.create` | Full control, zero runtime cost, no dependency lock-in |
| Cross-platform UI kit | `tamagui` | Compile-time styles, web+native, themeable |
| Bottom sheet | `@gorhom/bottom-sheet` | Gold standard, reanimated-powered, snap points, keyboard handling |
| Toast / snackbar | `burnt` | Native iOS/Android toasts, no overlay, 3KB |
| Toast (more features) | `sonner-native` | Sonner API, swipe to dismiss, custom JSX |
| Action sheet | `@expo/react-native-action-sheet` | Native action sheets on both platforms |
| Skeleton loading | `moti/skeleton` | Smooth shimmer, reanimated-based |
| Blur effects | `expo-blur` | Native blur view |
| Linear gradient | `expo-linear-gradient` | Native gradient backgrounds |
| SVG | `react-native-svg` | SVG rendering, ships with Expo |
| Markdown rendering | `react-native-markdown-display` | Render markdown in-app |
| Rich text editor | `10tap-editor` | ProseMirror-based, works in RN |
| Calendar / date picker | `react-native-calendars` | Full calendar UI, agenda, marking |
| Date/time picker | `@react-native-community/datetimepicker` | Native pickers, Expo compatible |

---

## 🖼️ Images & Media

| Need | Pick | Why |
|---|---|---|
| Image rendering | `expo-image` | **Always use this.** Caching, blurhash, transitions, AVIF/WebP/SVG |
| Image picker (camera roll) | `expo-image-picker` | Pick photos/videos, crop, compress |
| Camera | `expo-camera` | Preview + capture, barcode scanning |
| Video playback | `expo-av` or `expo-video` | `expo-video` for new projects (native controls) |
| Audio playback | `expo-av` | Play, record, background audio |
| Image manipulation (resize, crop) | `expo-image-manipulator` | Resize, rotate, flip, compress before upload |
| Blurhash generation | `blurhash` (JS) | Generate placeholders server-side or at upload |

**Rule:** Never use `<Image>` from `react-native`. Always `expo-image`.

---

## ✨ Animations & Gestures

| Need | Pick | Why |
|---|---|---|
| Layout animations | `react-native-reanimated` (Layout API) | Entering, exiting, layout transitions on native thread |
| Gesture-driven animations | `react-native-gesture-handler` + `reanimated` | Pan, pinch, tap — all 60fps |
| Spring/timing/decay | `reanimated` `withSpring`, `withTiming` | Declarative, cancellable, native thread |
| Shared element transitions | `react-native-reanimated` (Shared Transitions) | Expo Router compatible |
| Micro-interactions (declarative) | `moti` | Framer Motion API for RN, built on reanimated |
| Lottie animations | `lottie-react-native` | After Effects → JSON → native animation |
| Skeleton loaders | `moti/skeleton` | Shimmer effect with reanimated |
| Confetti / particles | `react-native-confetti-cannon` | Celebration effects |

**Pattern hierarchy:**
1. Simple opacity/translate → `Animated` (built-in) or `moti`
2. Gesture-driven → `gesture-handler` + `reanimated`
3. Complex choreography → `reanimated` worklets
4. Designer-made animations → Lottie

---

## 📡 Networking & API

| Need | Pick | Why |
|---|---|---|
| REST API client | `supabase-js` or plain `fetch` with a wrapper | No need for Axios in most cases |
| Heavy REST client (interceptors, retries) | `ky` | Tiny (3KB), modern fetch wrapper, retries, hooks |
| GraphQL | `urql` | Lighter than Apollo, better caching defaults for mobile |
| WebSocket / Realtime | Supabase Realtime or `socket.io-client` | Supabase if using Supabase, else socket.io |
| File upload | `expo-file-system` `uploadAsync` | Background upload, progress tracking |
| Network status | `@react-native-community/netinfo` | Detect online/offline, connection type |
| Offline queue | TanStack Query `onlineManager` + `NetInfo` | Pause mutations offline, flush when back online |

**Avoid:** Axios (large, unnecessary for most apps). Use `fetch` + a 30-line wrapper or `ky`.

---

## 📱 Device & Native APIs

| Need | Pick | Why |
|---|---|---|
| Push notifications | `expo-notifications` | Local + remote, scheduling, categories, Expo Push Service |
| Haptic feedback | `expo-haptics` | Tap, impact, notification feedback |
| Clipboard | `expo-clipboard` | Read/write clipboard |
| Linking (open URLs) | `expo-linking` | Open URLs, phone, email, maps |
| Share sheet | `expo-sharing` or RN `Share` | Native share dialog |
| Device info | `expo-device` | Model, OS, brand |
| App constants | `expo-constants` | App version, build number, Expo config |
| Location | `expo-location` | Foreground + background, geocoding |
| Contacts | `expo-contacts` | Read device contacts |
| Calendar | `expo-calendar` | Read/write device calendar |
| Sensors (accelerometer, gyro) | `expo-sensors` | Motion data, pedometer |
| Keep screen awake | `expo-keep-awake` | Prevent sleep during video/long tasks |
| Battery info | `expo-battery` | Battery level, charging state |
| Brightness | `expo-brightness` | Get/set screen brightness |
| Screen orientation | `expo-screen-orientation` | Lock/unlock orientation |
| Status bar | `expo-status-bar` | Style, hide, translucent |
| Splash screen | `expo-splash-screen` | Keep splash visible until app ready |
| App updates (OTA) | `expo-updates` | Check/fetch/reload OTA updates |
| In-app review | `expo-store-review` | Prompt App Store / Play Store review |

---

## 💰 Monetization

| Need | Pick | Why |
|---|---|---|
| In-app purchases (iOS/Android) | `react-native-purchases` (RevenueCat) | Cross-platform IAP, handles receipt validation, server-side |
| In-app purchases (bare) | `expo-in-app-purchases` | Lower-level, more control, Expo-managed |
| Ads | `react-native-google-mobile-ads` | AdMob banners, interstitials, rewarded |
| Paywall UI | RevenueCat Paywalls or custom | RevenueCat has a no-code paywall builder |

---

## 🧪 Testing

| Need | Pick | Why |
|---|---|---|
| Unit tests | `jest` | Ships with Expo, zero config |
| Component tests | `@testing-library/react-native` | Test behavior, not implementation |
| Snapshot tests | `jest` snapshots | Catch unintended UI changes |
| E2E tests | `maestro` | YAML-based, visual, works with Expo Go and dev builds |
| E2E (advanced) | `detox` | JS API, more control, harder setup |
| Mocking | `jest.mock` + `msw` | MSW for API mocking, jest.mock for modules |

---

## 🛠️ Dev Experience

| Need | Pick | Why |
|---|---|---|
| Linting | `eslint` + `eslint-config-expo` | Expo-specific rules |
| Formatting | `prettier` | Consistent code style |
| Path aliases | `@/` → `./src/` in `tsconfig.json` | Clean imports |
| Git hooks | `husky` + `lint-staged` | Pre-commit lint + format |
| Type checking CLI | `tsc --noEmit` | Catch type errors in CI |
| Bundle analysis | `expo-dev-client` + React DevTools | Profile re-renders, bundle size |
| Flipper alternative | `react-native-mmkv` devtools + React Query devtools | Inspect storage + cache |
| Error tracking (prod) | `sentry-expo` | Crash reports, breadcrumbs, source maps |
| Analytics | `expo-firebase-analytics` or `posthog-react-native` | PostHog if you want open-source |

---

## 🏗️ Build & Deploy

| Need | Pick | Why |
|---|---|---|
| Dev builds | `expo-dev-client` | Custom native modules in dev |
| Cloud builds | EAS Build | No local Xcode/Android Studio needed |
| App store submission | EAS Submit | Automated store upload |
| OTA updates | EAS Update | Push JS updates without store review |
| Environment configs | `eas.json` profiles + `app.config.ts` | Different env per build profile |
| App icons & splash | `expo-image` plugin or `@expo/config-plugins` | Generate all sizes from one source |
| Code signing | EAS credentials | Managed or local credentials |

---

## 🧩 Utilities

| Need | Pick | Why |
|---|---|---|
| Date formatting | `date-fns` | Tree-shakeable, immutable, tiny vs Moment |
| Date formatting (ultra-light) | `dayjs` | 2KB, Moment-compatible API |
| UUID generation | `expo-crypto` `randomUUID()` | Built-in, no extra dep |
| Validation | `zod` | Schema-first, TypeScript inference, composable |
| Deep clone / merge | `structuredClone` (built-in) | Native API, no lodash needed |
| Debounce / throttle | Write your own (5 lines) or `use-debounce` | Don't install lodash for one function |
| URL parsing | `URL` (built-in) | Native API |
| Currency formatting | `Intl.NumberFormat` (built-in) | Native API, locale-aware |
| i18n / localization | `expo-localization` + `i18next` + `react-i18next` | Industry standard, plurals, interpolation |
| Internationalized number/date | `Intl` APIs (built-in) | Don't install a lib for this |

**Rule:** Before installing a utility library, check if a built-in API (`Intl`, `URL`, `structuredClone`, `crypto.randomUUID`) already does it.

---

## 🚫 Libraries to Avoid (and Why)

| Library | Problem | Use Instead |
|---|---|---|
| `AsyncStorage` | Slow, async-only, no encryption | `react-native-mmkv` |
| `axios` | Large bundle (29KB), unnecessary | `fetch` wrapper or `ky` (3KB) |
| `moment` | 300KB+, mutable, deprecated | `date-fns` or `dayjs` |
| `lodash` (full) | 70KB+, most functions are built-in now | Cherry-pick or use native APIs |
| `redux` + `redux-thunk` | Massive boilerplate for mobile apps | `zustand` |
| `styled-components` | Runtime CSS-in-JS overhead on RN | `StyleSheet.create` |
| `react-native-fast-image` | Unmaintained, crashes on new arch | `expo-image` |
| `react-native-elements` | Outdated, heavy, opinionated | Build your own or use `tamagui` |
| `@react-navigation/native` (in new projects) | Expo Router wraps it and adds file-based routing | `expo-router` |
| `react-native-vector-icons` | Requires native linking, large | `@expo/vector-icons` (prebuilt) |

---

## Decision Flowchart

```
Need to render a list?
├── < 50 items → FlatList
├── 50-1000 items → FlatList + React.memo + getItemLayout
└── 1000+ items → FlashList (@shopify/flash-list)

Need state?
├── Comes from server/API → TanStack Query
├── Shared across screens → Zustand
├── Only used in one component → useState
└── Form inputs → React Hook Form

Need storage?
├── User preferences / cache → MMKV
├── Auth tokens / secrets → expo-secure-store
├── Relational data → expo-sqlite
└── Files → expo-file-system

Need animations?
├── Simple fade/slide → moti or Animated (built-in)
├── Gesture-driven → gesture-handler + reanimated
├── Complex choreography → reanimated worklets
└── Designer-provided → Lottie
```

---

## Skill Boundaries

| This skill handles | Defer to |
|---|---|
| Which library to pick for any use case | — |
| When to use vs. avoid a library | — |
| Coding patterns & config for chosen libraries | `expo-standard-patterns` |
| Folder structure & architecture | `feature-based-architecture` |
| App planning & requirements | `expo-app-architect` |
