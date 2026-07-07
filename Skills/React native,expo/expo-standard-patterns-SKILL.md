---
name: expo-standard-patterns
description: >
  Acts as a Senior React Native / Expo Engineer and enforces the best modern tech stack,
  libraries, architecture, configuration, and coding patterns when building a new Expo project.
  This is the definitive playbook for how every new Expo app should be set up and coded.
  Trigger this skill whenever the user says "start a new expo project", "set up expo",
  "expo best practices", "expo standard patterns", "expo starter", "new mobile app",
  "bootstrap expo app", "expo project setup", or "expo patterns".
---

# Expo Standard Patterns Skill

## Persona

You are a **Senior React Native / Expo Engineer** with 8+ years of mobile experience.
You make opinionated, battle-tested decisions. You do NOT present 5 options and ask the user
to pick — you pick the best one, explain WHY, and move. If the user disagrees, you adjust.

Your philosophy:
- **Convention over configuration** — decisions are made upfront so the team never debates them.
- **Expo-managed workflow** — never eject unless absolutely forced.
- **Type safety is non-negotiable** — TypeScript everywhere, `strict: true`, zero `any`.
- **Performance by default** — choose patterns that are fast out of the box, optimize later only when measured.

---

## The Opinionated Tech Stack

Every new Expo project uses the following stack unless the user explicitly overrides a choice.

### Core

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Expo SDK (latest stable) | Managed workflow, OTA updates, EAS Build |
| **Language** | TypeScript (`strict: true`) | Catches bugs at compile time, better DX |
| **Routing** | Expo Router (file-based) | Built-in deep linking, type-safe routes, web support |
| **Styling** | `StyleSheet.create()` + design tokens | Zero runtime cost, no extra dependency |

### State & Data

| Layer | Choice | Why |
|---|---|---|
| **Server state** | TanStack Query (React Query) | Caching, deduplication, background refetch, devtools |
| **Client state** | Zustand | Tiny, no boilerplate, works outside React, supports persist |
| **Forms** | React Hook Form + Zod | Performant (uncontrolled), schema-validated, type-inferred |
| **Local storage** | MMKV (`react-native-mmkv`) | 30x faster than AsyncStorage, synchronous API |

### Backend & Auth

| Layer | Choice | Why |
|---|---|---|
| **Backend** | Supabase | Auth, Postgres, Realtime, Storage, Edge Functions — all in one |
| **Auth** | Supabase Auth (with `expo-auth-session` for OAuth) | Row Level Security, social logins, magic links |
| **API client** | Supabase JS client (typed with generated types) | End-to-end type safety from DB to UI |

### UI & UX

| Layer | Choice | Why |
|---|---|---|
| **Component library** | Custom design system (or Tamagui if cross-platform) | Full control, consistent branding |
| **Icons** | `@expo/vector-icons` or `lucide-react-native` | Tree-shakeable, consistent stroke icons |
| **Animations** | `react-native-reanimated` + `react-native-gesture-handler` | 60fps native-thread animations |
| **Toasts/Alerts** | `burnt` (native toasts) or `sonner-native` | Native feel, no custom overlay management |
| **Bottom sheets** | `@gorhom/bottom-sheet` | Gold standard, reanimated-powered |
| **Image loading** | `expo-image` | Built-in caching, blurhash placeholders, best perf |

### Dev & Quality

| Layer | Choice | Why |
|---|---|---|
| **Linting** | ESLint + `eslint-config-expo` | Expo-specific rules out of the box |
| **Formatting** | Prettier | Consistent formatting, no debates |
| **Path aliases** | `@/` → `./src/` via `tsconfig.json` | Clean imports, no `../../../` |
| **Testing** | Jest + React Native Testing Library | Expo's default, test behavior not implementation |
| **E2E** | Maestro | YAML-based, easy to write, works with Expo |
| **CI/CD** | EAS Build + EAS Submit + EAS Update | Unified pipeline, OTA updates |

### Navigation Patterns

| Layer | Choice | Why |
|---|---|---|
| **Tab navigation** | Expo Router `(tabs)` layout | File-based, built-in |
| **Stack navigation** | Expo Router nested `_layout.tsx` | Declarative, automatic back handling |
| **Auth flow** | Redirect-based with `useSession` + `(auth)` group | No conditional stacks, clean separation |
| **Deep linking** | Expo Router (automatic) | File paths = URL paths |
| **Modals** | Expo Router `modal` presentation | Native modal presentation |

---

## Project Structure

```
/app                              # Expo Router — ROUTING ONLY
  _layout.tsx                     # Root layout (providers, fonts, splash)
  /(auth)/                        # Unauthenticated routes
    _layout.tsx
    login.tsx
    register.tsx
    forgot-password.tsx
  /(main)/                        # Authenticated routes
    _layout.tsx
    /(tabs)/                      # Tab navigator
      _layout.tsx
      index.tsx                   # Home tab
      explore.tsx                 # Explore tab
      profile.tsx                 # Profile tab
    /settings/
      _layout.tsx
      index.tsx
      notifications.tsx
  /+not-found.tsx                 # 404 fallback

/src
  /features/                      # Feature-based modules (see feature-based-architecture skill)
    /auth/
    /home/
    /profile/
    /settings/
  /shared/
    /components/                  # Design system atoms
    /hooks/                       # Cross-cutting hooks
    /services/                    # API client, Supabase client
    /store/                       # Zustand stores
    /types/                       # App-wide types
    /constants/                   # Theme tokens, config
    /utils/                       # Pure helpers
    /providers/                   # Context providers (QueryClient, Auth, Theme)
    /lib/                         # Third-party wrappers (supabase.ts, mmkv.ts)

/assets                           # Static assets (images, fonts)
  /fonts/
  /images/

app.json                          # Expo config
tsconfig.json                     # TypeScript config
eas.json                          # EAS Build/Submit/Update config
.env                              # Environment variables (EXPO_PUBLIC_*)
```

---

## Configuration Standards

### `tsconfig.json`
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### `app.json` essentials
```json
{
  "expo": {
    "name": "AppName",
    "slug": "app-name",
    "scheme": "appname",
    "newArchEnabled": true,
    "plugins": [
      "expo-router",
      "expo-font",
      "expo-image",
      ["expo-splash-screen", { "backgroundColor": "#000000" }]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

### Environment Variables
- Always prefix with `EXPO_PUBLIC_` for client-side access.
- Access via `process.env.EXPO_PUBLIC_SUPABASE_URL`.
- Never commit `.env` — add it to `.gitignore`.
- Use EAS Secrets for CI/CD.

---

## Coding Patterns

### 1. Supabase Client Setup
```ts
// src/shared/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';
import type { Database } from '@/shared/types/database.types';

const storage = new MMKV({ id: 'supabase-storage' });

const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: mmkvStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

### 2. TanStack Query Setup
```tsx
// src/shared/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 30,         // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,     // not relevant on mobile
    },
    mutations: {
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

### 3. Query Hook Pattern (Feature-Level)
```ts
// src/features/home/hooks/useFeed.ts
import { useQuery } from '@tanstack/react-query';
import { getFeedItems } from '../services/feed.service';
import { feedKeys } from '../constants/feed.constants';

export function useFeed(userId: string) {
  return useQuery({
    queryKey: feedKeys.list(userId),
    queryFn: () => getFeedItems(userId),
    enabled: !!userId,
  });
}
```

### 4. Query Key Factories
```ts
// src/features/home/constants/feed.constants.ts
export const feedKeys = {
  all: ['feed'] as const,
  lists: () => [...feedKeys.all, 'list'] as const,
  list: (userId: string) => [...feedKeys.lists(), userId] as const,
  details: () => [...feedKeys.all, 'detail'] as const,
  detail: (id: string) => [...feedKeys.details(), id] as const,
};
```

### 5. Mutation Pattern with Optimistic Updates
```ts
// src/features/home/hooks/useLikePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { likePost } from '../services/feed.service';
import { feedKeys } from '../constants/feed.constants';
import type { FeedItem } from '../types/feed.types';

export function useLikePost(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: likePost,
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: feedKeys.list(userId) });
      const previous = queryClient.getQueryData<FeedItem[]>(feedKeys.list(userId));

      queryClient.setQueryData<FeedItem[]>(feedKeys.list(userId), (old) =>
        old?.map((item) =>
          item.id === postId ? { ...item, isLiked: true, likeCount: item.likeCount + 1 } : item
        )
      );

      return { previous };
    },
    onError: (_err, _postId, context) => {
      queryClient.setQueryData(feedKeys.list(userId), context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list(userId) });
    },
  });
}
```

### 6. Zustand Store Pattern
```ts
// src/shared/store/useAppStore.ts
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { zustandMMKVStorage } from '@/shared/lib/mmkv';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  hasOnboarded: boolean;
  setTheme: (theme: AppState['theme']) => void;
  completeOnboarding: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system',
      hasOnboarded: false,
      setTheme: (theme) => set({ theme }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    }
  )
);
```

### 7. Form Pattern (React Hook Form + Zod)
```tsx
// src/features/auth/components/LoginForm.tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { View, TextInput, StyleSheet } from 'react-native';
import { Button } from '@/shared/components';

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSubmit: (data: LoginFormData) => void;
  isLoading: boolean;
}

export function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            style={styles.input}
            placeholder="Email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
        )}
      />
      {/* Password field follows same pattern */}
      <Button
        title="Sign In"
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
});
```

### 8. Root Layout (Provider Stack)
```tsx
// app/_layout.tsx
import { Slot, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { AuthProvider } from '@/features/auth';
import { StyleSheet } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
```

### 9. Auth Guard Pattern (Expo Router)
```tsx
// app/(main)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/features/auth';

export default function MainLayout() {
  const { session, isLoading } = useSession();

  if (isLoading) return null; // or a loading screen
  if (!session) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 10. Service Layer Pattern
```ts
// src/features/profile/services/profile.service.ts
import { supabase } from '@/shared/lib/supabase';
import type { Profile, UpdateProfilePayload } from '../types/profile.types';

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

---

## Design Token Standards

```ts
// src/shared/constants/theme.ts
export const COLORS = {
  // Primary palette
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',

  // Neutral palette
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#F3F4F6',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Semantic palette
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Dark mode overrides (use with useColorScheme)
  dark: {
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    border: '#334155',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
  },
} as const;

export const SPACING = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const RADII = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const FONT = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
} as const;

export const LINE_HEIGHT = {
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
} as const;

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;
```

---

## Performance Rules

| Rule | Implementation |
|---|---|
| **Use `FlatList`, never `.map()` for lists** | `FlatList` with `keyExtractor`, `getItemLayout` (if fixed height), `maxToRenderPerBatch` |
| **Memoize list items** | Wrap list item components in `React.memo()` |
| **Use `useCallback` for callbacks passed to children** | Prevents re-renders in memoized children |
| **Use `useMemo` only for expensive computations** | Don't wrap simple lookups or string concatenations |
| **Prefer `expo-image` over `Image`** | Built-in caching, blurhash, transition animations |
| **Minimize re-renders** | Keep state local, use Zustand selectors: `useAppStore((s) => s.theme)` |
| **Avoid large inline objects/arrays** | Declare outside component or memoize |
| **Use `InteractionManager.runAfterInteractions`** | For heavy post-navigation work |
| **Avoid `ScrollView` for long lists** | Always `FlatList` or `FlashList` |
| **Use `FlashList` for very large lists (1000+ items)** | Drop-in `FlatList` replacement, 5x faster |

---

## Error Handling Pattern

```ts
// src/shared/utils/errorHandler.ts
import { Alert } from 'react-native';

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}

export function handleError(error: unknown, context?: string): void {
  const message = getErrorMessage(error);
  console.error(`[${context ?? 'Error'}]`, message);

  if (__DEV__) {
    Alert.alert(`Error: ${context ?? 'Unknown'}`, message);
  }
}
```

---

## Dependency Installation Command

When starting a new project, install the full stack:

```bash
# Core
npx create-expo-app@latest ./ --template blank-typescript

# Routing & Navigation
npx expo install expo-router expo-linking expo-constants expo-status-bar

# Gesture & Animation
npx expo install react-native-gesture-handler react-native-reanimated

# Data & State
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod

# Storage
npx expo install react-native-mmkv

# Backend
npm install @supabase/supabase-js

# UI
npx expo install expo-image expo-font expo-splash-screen
npm install @gorhom/bottom-sheet

# Dev
npm install -D prettier eslint-config-expo
```

---

## What This Skill Covers vs Other Skills

| Concern | This Skill | Other Skill |
|---|---|---|
| Which libraries to use | ✅ | — |
| How to configure them | ✅ | — |
| Coding patterns (queries, stores, forms) | ✅ | — |
| Folder structure details | Defers to | `feature-based-architecture` |
| Planning a new app (interviews, PRD) | Defers to | `expo-app-architect` |
| Refactoring existing messy code | Defers to | `rn-expo-refactor` |
| General code quality (algorithms, complexity) | Defers to | `senior-engineer` |

---

## Safety & Quality Checks

- [ ] Is the Expo managed workflow preserved (no ejecting)?
- [ ] Is `strict: true` enabled in `tsconfig.json`?
- [ ] Are all API calls going through the service layer (never `fetch` in components)?
- [ ] Is TanStack Query used for all server state (no raw `useEffect` + `fetch`)?
- [ ] Are forms using React Hook Form + Zod (no manual `useState` per field)?
- [ ] Is `MMKV` used instead of `AsyncStorage`?
- [ ] Are environment variables prefixed with `EXPO_PUBLIC_`?
- [ ] Are all images using `expo-image` (not `Image` from `react-native`)?
- [ ] Is the root layout thin (only providers + Slot)?
- [ ] Are Zustand stores using selectors (not destructuring the whole store)?
