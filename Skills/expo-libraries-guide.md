# React Native / Expo — Best Libraries Guide 2025+

> A curated, opinionated guide to the best libraries and tools for building production React Native apps with Expo.
> Each library is rated ⭐ 1–5 based on: stability, DX, maintenance, community, and Expo compatibility.

---

## 📦 Navigation & Routing

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `expo-router` | ⭐⭐⭐⭐⭐ | File-based routing, deep linking, typed routes | **The default.** Wraps React Navigation, adds file-based routing, automatic deep linking, and web support. Every new Expo project should use this. |
| `@react-navigation/native` | ⭐⭐⭐⭐ | Imperative routing for legacy projects | Still solid, but Expo Router wraps it and does more. Use directly only if you can't adopt Expo Router. |
| `@react-navigation/bottom-tabs` | ⭐⭐⭐⭐ | Tab bar navigation | Used under the hood by Expo Router's `(tabs)` layout. Install directly only with bare React Navigation. |
| `react-native-screens` | ⭐⭐⭐⭐⭐ | Native screen containers | Ships with Expo. Enables native screen management for stack navigators. You never install it manually — just know it exists. |

---

## 🗄️ State Management

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `zustand` | ⭐⭐⭐⭐⭐ | Global client state (theme, user prefs, onboarding) | 1KB, zero boilerplate, works outside React, built-in `persist` middleware. Best state library for RN. |
| `@tanstack/react-query` | ⭐⭐⭐⭐⭐ | Server/async state (API data, caching, pagination) | Handles caching, background refetch, deduplication, infinite scroll, optimistic updates. Eliminates 90% of `useEffect` data fetching. |
| `jotai` | ⭐⭐⭐⭐ | Atomic state (fine-grained reactivity) | Great for apps with many small independent pieces of state. Simpler than Recoil. Overkill for most apps — use Zustand first. |
| `redux-toolkit` | ⭐⭐⭐ | Complex state with time-travel debugging | Still works, but too much boilerplate for mobile. Only use if your team already knows Redux. |
| `legend-state` | ⭐⭐⭐⭐ | High-performance reactive state | Signal-based, extremely fast. Good for apps with heavy real-time data. Newer, smaller community. |

---

## 📝 Forms & Validation

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `react-hook-form` | ⭐⭐⭐⭐⭐ | Form state management | Uncontrolled inputs = minimal re-renders. `Controller` component for RN. Best performance of any form lib. |
| `zod` | ⭐⭐⭐⭐⭐ | Schema validation + TypeScript inference | Define your schema once, get validation + TypeScript types. Pairs perfectly with react-hook-form via `@hookform/resolvers`. |
| `yup` | ⭐⭐⭐⭐ | Schema validation (runtime) | Older alternative to Zod. Works fine but no TypeScript inference. Use Zod for new projects. |
| `@hookform/resolvers` | ⭐⭐⭐⭐⭐ | Connect Zod/Yup schemas to react-hook-form | Tiny bridge lib. Install alongside react-hook-form + your validator. |

---

## 💾 Storage & Persistence

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `react-native-mmkv` | ⭐⭐⭐⭐⭐ | Fast key-value storage | **30x faster than AsyncStorage.** Synchronous API, supports encryption, works with Zustand persist and Supabase auth. Use for everything non-sensitive. |
| `expo-secure-store` | ⭐⭐⭐⭐⭐ | Sensitive data (auth tokens, API keys) | Uses iOS Keychain / Android Keystore. Encrypted at the OS level. Size limit ~2KB per item. |
| `expo-sqlite` | ⭐⭐⭐⭐ | Relational local data, offline-first | Full SQLite database. Good for structured data with queries. WAL mode for performance. |
| `@op-engineering/op-sqlite` | ⭐⭐⭐⭐ | High-performance SQLite | Faster than expo-sqlite, JSI-based. Use when querying 10k+ rows or need raw perf. |
| `expo-file-system` | ⭐⭐⭐⭐⭐ | Read/write files, downloads, uploads | Built-in Expo module. Handles file downloads with resume, directory management, file info. |
| `@react-native-async-storage/async-storage` | ⭐⭐ | Legacy key-value storage | **Avoid in new projects.** Slow, async-only, no encryption. Only use if a dependency requires it. |

---

## 🔐 Authentication

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `@supabase/supabase-js` | ⭐⭐⭐⭐⭐ | Full auth (email, OAuth, magic link) + DB | Auth + Postgres + Realtime + Storage in one SDK. Row-Level Security. Best BaaS for Expo. |
| `expo-auth-session` | ⭐⭐⭐⭐⭐ | OAuth flows (Google, GitHub, Discord) | Expo-managed OAuth. Handles redirect URIs, PKCE, token exchange. Works in Expo Go and dev builds. |
| `expo-apple-authentication` | ⭐⭐⭐⭐⭐ | Apple Sign-In | Native Apple login button + credential API. Required for App Store if you offer social login. |
| `expo-web-browser` | ⭐⭐⭐⭐⭐ | Open OAuth URLs in-app | Used with expo-auth-session for the OAuth browser redirect. Also good for opening external links. |
| `expo-local-authentication` | ⭐⭐⭐⭐⭐ | Biometrics (Face ID, fingerprint) | Gate sensitive actions. Check hardware support, authenticate, get enrollment status. |
| `@react-native-firebase/auth` | ⭐⭐⭐⭐ | Firebase Authentication | Use if your backend is Firebase. Requires dev build (no Expo Go). |
| `@clerk/clerk-expo` | ⭐⭐⭐⭐ | Managed auth (hosted UI, SSO, MFA) | Drop-in auth with pre-built UI. Good if you don't want to build auth screens. Higher cost at scale. |

---

## 🎨 UI Components & Design

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `@gorhom/bottom-sheet` | ⭐⭐⭐⭐⭐ | Bottom sheets, drawers | Gold standard. Reanimated-powered, snap points, keyboard-aware, scrollable content. No real competitor. |
| `burnt` | ⭐⭐⭐⭐⭐ | Native toast notifications | 3KB, uses native iOS/Android toasts. No overlay management. Dead simple API: `toast("Done!")`. |
| `sonner-native` | ⭐⭐⭐⭐ | Toast notifications (custom JSX) | More features than burnt: custom content, swipe dismiss, stacking. Use when you need styled toasts. |
| `expo-blur` | ⭐⭐⭐⭐⭐ | Blur effects | Native blur view. Great for modals, overlays, frosted glass effects. Ships with Expo. |
| `expo-linear-gradient` | ⭐⭐⭐⭐⭐ | Gradient backgrounds | Native gradient. Use for buttons, headers, backgrounds. Ships with Expo. |
| `react-native-svg` | ⭐⭐⭐⭐⭐ | SVG rendering | Render SVG elements. Ships with Expo. Foundation for many icon and chart libraries. |
| `@expo/react-native-action-sheet` | ⭐⭐⭐⭐ | Native action sheets | Cross-platform action sheets with native look on both platforms. |
| `tamagui` | ⭐⭐⭐⭐ | Cross-platform UI kit | Compile-time styles, themes, responsive. Great if you need web + native from one codebase. Learning curve. |
| `nativewind` | ⭐⭐⭐⭐ | Tailwind CSS in React Native | Tailwind utility classes in RN. Good DX if your team knows Tailwind. Adds build complexity. |
| `react-native-calendars` | ⭐⭐⭐⭐ | Calendar UI, agenda, date marking | Full calendar component with day/week/month views. Customizable but heavy. |
| `@react-native-community/datetimepicker` | ⭐⭐⭐⭐ | Native date/time picker | Uses native iOS/Android pickers. Expo compatible. |
| `moti/skeleton` | ⭐⭐⭐⭐⭐ | Skeleton loading screens | Beautiful shimmer effect built on reanimated. Dead simple: wrap any view in `<Skeleton>`. |
| `react-native-markdown-display` | ⭐⭐⭐ | Render markdown | Works but limited customization. Fine for simple markdown rendering. |
| `10tap-editor` | ⭐⭐⭐⭐ | Rich text editor | ProseMirror-based, works in RN. Only mature RN rich text option. |
| `react-native-pager-view` | ⭐⭐⭐⭐⭐ | Swipeable page views | Native paging. Great for onboarding flows, image galleries, tab views. |
| `@shopify/flash-list` | ⭐⭐⭐⭐⭐ | Ultra-fast lists (1000+ items) | Drop-in FlatList replacement. 5x faster rendering. Use for feeds, chats, large datasets. |

---

## 🖼️ Images & Media

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `expo-image` | ⭐⭐⭐⭐⭐ | Image rendering & caching | **Always use this instead of `<Image>`.** Disk caching, blurhash placeholders, transition animations, AVIF/WebP/SVG/GIF support. |
| `expo-image-picker` | ⭐⭐⭐⭐⭐ | Pick photos/videos from camera roll | Pick single or multiple, crop, compress, choose quality. Works in Expo Go. |
| `expo-camera` | ⭐⭐⭐⭐ | Camera preview + capture | Take photos/videos, barcode scanning, face detection. Requires dev build for full features. |
| `expo-video` | ⭐⭐⭐⭐ | Video playback (new API) | Native video player with controls. Newer than expo-av's Video. Use for new projects. |
| `expo-av` | ⭐⭐⭐⭐ | Audio playback & recording | Play sounds, record audio, background audio. Video component is legacy — use expo-video instead. |
| `expo-image-manipulator` | ⭐⭐⭐⭐ | Resize, crop, rotate, compress images | Process images before upload. Reduce file size, change dimensions. |
| `react-native-image-crop-picker` | ⭐⭐⭐ | Image picker with built-in cropper | More crop options than expo-image-picker. Requires dev build. Use only if you need advanced cropping. |

---

## ✨ Animations & Gestures

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `react-native-reanimated` | ⭐⭐⭐⭐⭐ | All animations | **The animation library for RN.** Runs on native thread (60fps). Spring, timing, decay, layout animations, shared transitions. Ships with Expo. |
| `react-native-gesture-handler` | ⭐⭐⭐⭐⭐ | Touch gestures (pan, pinch, tap, swipe) | Native gesture system. Combine with reanimated for gesture-driven animations. Ships with Expo. |
| `moti` | ⭐⭐⭐⭐⭐ | Declarative animations (Framer Motion API) | `<MotiView animate={{ opacity: 1 }} />`. Built on reanimated. Great for simple transitions without worklet boilerplate. |
| `lottie-react-native` | ⭐⭐⭐⭐ | After Effects animations | Play `.json` Lottie files. Great for loading spinners, success animations, onboarding illustrations. |
| `react-native-skia` | ⭐⭐⭐⭐ | 2D drawing, custom graphics, charts | Skia rendering engine in RN. Use for custom charts, canvas drawing, advanced visual effects. |
| `react-native-confetti-cannon` | ⭐⭐⭐ | Confetti / celebration effects | Fun but niche. Use for achievement screens, purchases. |

---

## 📡 Networking & API

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `fetch` (built-in) | ⭐⭐⭐⭐ | HTTP requests | Built into RN. Sufficient for most apps when wrapped in a small utility. No install needed. |
| `ky` | ⭐⭐⭐⭐⭐ | HTTP client with retries, hooks, timeout | 3KB, modern fetch wrapper. Retries, hooks (beforeRequest, afterResponse), JSON by default. Best fetch wrapper. |
| `@supabase/supabase-js` | ⭐⭐⭐⭐⭐ | Supabase backend API | Typed queries, realtime subscriptions, auth, storage — all in one client. |
| `@react-native-community/netinfo` | ⭐⭐⭐⭐⭐ | Network status detection | Detect online/offline, WiFi vs cellular, connection quality. Essential for offline-first apps. |
| `socket.io-client` | ⭐⭐⭐⭐ | WebSocket (custom server) | Use for custom realtime servers. If using Supabase, use their built-in Realtime instead. |
| `urql` | ⭐⭐⭐⭐ | GraphQL client | Lighter than Apollo (7KB vs 30KB+). Better caching defaults for mobile. |
| `axios` | ⭐⭐ | HTTP client | **Avoid.** 29KB, unnecessary on modern RN. Use `fetch` or `ky` instead. |

---

## 📱 Device & Native APIs (Expo Modules)

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `expo-notifications` | ⭐⭐⭐⭐⭐ | Push & local notifications | Schedule, handle, categories, Expo Push Service for remote. Requires dev build for full features. |
| `expo-haptics` | ⭐⭐⭐⭐⭐ | Haptic feedback | Three types: impact, notification, selection. Use on button presses, toggles, success/error. Tiny API. |
| `expo-clipboard` | ⭐⭐⭐⭐⭐ | Copy/paste text | Simple: `Clipboard.setStringAsync("text")`. Built-in Expo module. |
| `expo-linking` | ⭐⭐⭐⭐⭐ | Open URLs, phone, email, maps | `Linking.openURL("tel:...")`, `mailto:`, deep links. Ships with Expo. |
| `expo-sharing` | ⭐⭐⭐⭐ | Native share sheet | Share files and URLs via the native share dialog. |
| `expo-location` | ⭐⭐⭐⭐⭐ | GPS location | Foreground + background location, geocoding, reverse geocoding, geofencing. |
| `expo-contacts` | ⭐⭐⭐⭐ | Read device contacts | Fetch contacts with permissions. Read-only on some platforms. |
| `expo-camera` | ⭐⭐⭐⭐ | Camera access | Preview, capture, barcode scanning. Requires dev build. |
| `expo-sensors` | ⭐⭐⭐⭐ | Accelerometer, gyroscope, pedometer | Real-time motion data. Use for step tracking, tilt controls, motion gestures. |
| `expo-constants` | ⭐⭐⭐⭐⭐ | App version, build, Expo config | Read manifest data, app version, device ID. Ships with Expo. |
| `expo-device` | ⭐⭐⭐⭐ | Device model, OS, brand | Detect device info for analytics or conditional features. |
| `expo-keep-awake` | ⭐⭐⭐⭐ | Prevent screen sleep | Use during video playback, long-running tasks, gaming. |
| `expo-status-bar` | ⭐⭐⭐⭐⭐ | Status bar styling | Light/dark content, translucent, hide/show. Ships with Expo. |
| `expo-splash-screen` | ⭐⭐⭐⭐⭐ | Splash screen control | Keep splash visible until fonts/data loaded. `preventAutoHideAsync()` + `hideAsync()`. |
| `expo-updates` | ⭐⭐⭐⭐⭐ | OTA updates | Check + download + apply updates without going through app stores. Use with EAS Update. |
| `expo-store-review` | ⭐⭐⭐⭐ | App Store / Play Store review prompt | Prompt users to rate your app. Has rate-limiting built in by the OS. |
| `expo-screen-orientation` | ⭐⭐⭐⭐ | Lock/unlock screen orientation | Lock to portrait/landscape for specific screens. |
| `expo-brightness` | ⭐⭐⭐⭐ | Screen brightness control | Get/set brightness. Useful for QR code display, media viewing. |
| `expo-battery` | ⭐⭐⭐ | Battery level, charging state | Niche. Use for low-battery warnings or disabling heavy features. |
| `expo-crypto` | ⭐⭐⭐⭐⭐ | UUID, hashing, random bytes | `Crypto.randomUUID()`, SHA hashing. No need for `uuid` package. |

---

## 💰 Monetization & Payments

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `react-native-purchases` (RevenueCat) | ⭐⭐⭐⭐⭐ | In-app purchases & subscriptions | Cross-platform IAP. Handles receipt validation, entitlements, analytics server-side. Free tier up to $2.5k/mo revenue. Best IAP solution. |
| `expo-in-app-purchases` | ⭐⭐⭐ | In-app purchases (lower level) | More manual. You handle receipt validation yourself. Use only if you need full control or can't use RevenueCat. |
| `react-native-google-mobile-ads` | ⭐⭐⭐⭐ | AdMob ads (banner, interstitial, rewarded) | Google AdMob for RN. Requires dev build. Solid, well-maintained. |
| `stripe` (@stripe/stripe-react-native) | ⭐⭐⭐⭐ | Payment processing (non-IAP) | For physical goods, services, tips — things that don't go through App Store. |

---

## 🧪 Testing

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `jest` | ⭐⭐⭐⭐⭐ | Unit & integration tests | Ships with Expo. Zero config. Use for hooks, utils, services. |
| `@testing-library/react-native` | ⭐⭐⭐⭐⭐ | Component testing | Test behavior, not implementation. `render()`, `fireEvent`, `waitFor`. Industry standard. |
| `maestro` | ⭐⭐⭐⭐⭐ | E2E testing | YAML-based, visual, record & replay. Works with Expo Go and dev builds. Easiest E2E setup for RN. |
| `detox` | ⭐⭐⭐⭐ | E2E testing (advanced) | JavaScript API, more control than Maestro. Harder setup, requires dev build. Use for complex E2E. |
| `msw` (Mock Service Worker) | ⭐⭐⭐⭐⭐ | API mocking for tests | Intercept network requests in tests. Works with TanStack Query. Much better than manual `jest.mock`. |
| `@testing-library/jest-native` | ⭐⭐⭐⭐ | Custom Jest matchers for RN | `toBeVisible()`, `toHaveStyle()`, etc. Quality-of-life improvement for component tests. |

---

## 🛠️ Developer Experience

| Library / Tool | Rating | Use Case | Notes |
|---|---|---|---|
| `eslint` + `eslint-config-expo` | ⭐⭐⭐⭐⭐ | Linting | Expo-specific lint rules. Catches common RN mistakes. |
| `prettier` | ⭐⭐⭐⭐⭐ | Code formatting | No debates about formatting. Set it and forget it. |
| `husky` | ⭐⭐⭐⭐ | Git hooks | Run lint + format on pre-commit. Prevents bad code from getting committed. |
| `lint-staged` | ⭐⭐⭐⭐⭐ | Run linters on staged files only | Pair with husky. Only lint what's changed = fast pre-commit hooks. |
| `sentry-expo` | ⭐⭐⭐⭐⭐ | Crash reporting & error tracking | Source maps, breadcrumbs, performance monitoring. Essential for production apps. |
| `posthog-react-native` | ⭐⭐⭐⭐ | Product analytics | Open-source analytics. Feature flags, session recording, funnels. Alternative to Mixpanel/Amplitude. |
| `expo-dev-client` | ⭐⭐⭐⭐⭐ | Custom development builds | Run native modules in development. Required for libraries that don't work in Expo Go. |
| `react-native-flipper` | ⭐⭐ | Debugging tool | **Avoid.** Deprecated by Meta. Use React DevTools + TanStack Query devtools instead. |

---

## 🏗️ Build, Deploy & CI/CD

| Tool | Rating | Use Case | Notes |
|---|---|---|---|
| EAS Build | ⭐⭐⭐⭐⭐ | Cloud builds (iOS + Android) | Build without local Xcode/Android Studio. Free tier: 30 builds/month. |
| EAS Submit | ⭐⭐⭐⭐⭐ | App Store / Play Store submission | Automated upload to stores. One command: `eas submit`. |
| EAS Update | ⭐⭐⭐⭐⭐ | Over-the-air JS updates | Push JS/asset changes without store review. Instant rollbacks. |
| `app.config.ts` | ⭐⭐⭐⭐⭐ | Dynamic Expo config | TypeScript config with env-aware values. Better than static `app.json`. |
| `eas.json` | ⭐⭐⭐⭐⭐ | Build profiles | Define dev/staging/production profiles with different env vars, channels, configs. |

---

## 🧩 Utilities

| Library | Rating | Use Case | Notes |
|---|---|---|---|
| `date-fns` | ⭐⭐⭐⭐⭐ | Date formatting, parsing, comparison | Tree-shakeable (import only what you use). Immutable. 80+ functions. Use over Moment.js. |
| `dayjs` | ⭐⭐⭐⭐ | Lightweight date library | 2KB, Moment-compatible API. Use if you want minimal bundle size. Less feature-rich than date-fns. |
| `zod` | ⭐⭐⭐⭐⭐ | Runtime validation + TypeScript inference | Validate API responses, form inputs, env vars. Types are inferred from schemas — define once, use everywhere. |
| `i18next` + `react-i18next` | ⭐⭐⭐⭐⭐ | Internationalization (i18n) | Industry standard. Plurals, interpolation, namespaces, lazy loading. Pair with `expo-localization`. |
| `expo-localization` | ⭐⭐⭐⭐⭐ | Detect device locale/language | Get user's locale, calendar, currency preferences. Ships with Expo. |
| `clsx` | ⭐⭐⭐⭐ | Conditional className joining | Useful with NativeWind. 228 bytes. |
| `nanoid` | ⭐⭐⭐⭐ | Tiny unique ID generator | Smaller than UUID. Use `expo-crypto` `randomUUID()` if you need standard UUIDs. |
| `lodash-es` | ⭐⭐⭐ | Utility functions | **Import selectively:** `import groupBy from 'lodash-es/groupBy'`. Never import the full package. Most functions have native JS alternatives now. |
| `moment` | ⭐ | Date library | **Avoid.** 300KB+, mutable, officially deprecated. Use date-fns or dayjs. |

---

## 🚫 Libraries to Avoid

| Library | Rating | Problem | Use Instead |
|---|---|---|---|
| `@react-native-async-storage/async-storage` | ⭐⭐ | Slow (async-only), no encryption, legacy | `react-native-mmkv` |
| `axios` | ⭐⭐ | 29KB, unnecessary features for RN | `fetch` wrapper or `ky` (3KB) |
| `moment` | ⭐ | 300KB+, mutable API, deprecated | `date-fns` or `dayjs` |
| `lodash` (full import) | ⭐⭐ | 70KB+, most functions are built-in now | Native JS or `lodash-es` (cherry-pick) |
| `redux` + `redux-thunk` | ⭐⭐ | Extreme boilerplate for mobile | `zustand` |
| `styled-components` | ⭐⭐ | Runtime CSS-in-JS overhead on RN | `StyleSheet.create` |
| `react-native-fast-image` | ⭐ | Unmaintained, crashes on New Architecture | `expo-image` |
| `react-native-elements` | ⭐⭐ | Outdated, heavy, limiting | Build your own or `tamagui` |
| `react-native-vector-icons` | ⭐⭐ | Requires native linking, large bundle | `@expo/vector-icons` (prebuilt) |
| `react-native-flipper` | ⭐ | Deprecated by Meta, causes build issues | React DevTools + Query devtools |

---

## ⭐ Rating Criteria

| Stars | Meaning |
|---|---|
| ⭐⭐⭐⭐⭐ | Best-in-class. Actively maintained, great DX, Expo compatible, battle-tested in production. **Use with confidence.** |
| ⭐⭐⭐⭐ | Very good. Minor tradeoffs (learning curve, setup complexity, or slightly less active maintenance). **Solid choice.** |
| ⭐⭐⭐ | Good enough. Works but has notable limitations, or better alternatives exist. **Use if it fits your specific case.** |
| ⭐⭐ | Avoid if possible. Outdated, heavy, or has superior replacements. **Legacy only.** |
| ⭐ | Don't use. Deprecated, unmaintained, or actively harmful to your bundle/performance. **Replace immediately.** |

---

*Last updated: July 2025. Libraries evolve — verify versions and changelogs before adopting.*
