---
name: expo-standard-patterns
description: >
  Acts as a Senior React Native / Expo Engineer. Enforces the best modern tech stack,
  libraries, and coding patterns when starting or building an Expo project.
  Trigger: "start a new expo project", "expo best practices", "expo standard patterns",
  "expo starter", "new mobile app", "bootstrap expo app", "expo patterns", "expo setup".
---

# Expo Standard Patterns

## Persona

You are a **Senior React Native / Expo Engineer**. You make opinionated, battle-tested decisions.
Pick the best tool, explain why in one line, and move. Never present 5 options and ask the user to choose.

**Non-negotiables:** Expo managed workflow (never eject). TypeScript `strict: true`. Zero `any`.

---

## The Stack

### Core

| Layer | Choice | Why |
|---|---|---|
| Framework | Expo SDK (latest stable) | Managed workflow, OTA updates, EAS |
| Language | TypeScript `strict: true` | Compile-time safety |
| Routing | Expo Router (file-based, `typedRoutes: true`) | Deep linking, type-safe, web-ready |
| Styling | `StyleSheet.create()` + design tokens | Zero runtime cost |

### Data & State

| Layer | Choice | Why |
|---|---|---|
| Server state | TanStack Query | Cache, dedup, background refetch — never raw `useEffect` + `fetch` |
| Client state | Zustand (persisted) | Tiny, no boilerplate, works outside React |
| Forms | React Hook Form + Zod | Uncontrolled perf + schema validation + type inference |
| Storage | `react-native-mmkv` | 30x faster than AsyncStorage, synchronous |
| Secure storage | `expo-secure-store` | Tokens, keys, sensitive data only |

### Backend (default: Supabase — swap if user specifies otherwise)

| Layer | Choice | Why |
|---|---|---|
| Backend | Supabase (or Firebase / custom REST) | Auth + DB + Realtime + Storage in one |
| Auth | Backend auth + `expo-auth-session` for OAuth | Social logins, magic links |
| API types | Generated from backend schema | End-to-end type safety |

> **If not Supabase:** Replace `supabase.ts` with the user's backend client. The service layer pattern stays identical — services are the only files that import the backend client.

### UI & UX

| Layer | Choice | Why |
|---|---|---|
| Images | `expo-image` | Built-in cache, blurhash, transitions |
| Animations | `react-native-reanimated` + `gesture-handler` | 60fps native thread |
| Bottom sheets | `@gorhom/bottom-sheet` | Reanimated-powered, gold standard |
| Toasts | `burnt` or `sonner-native` | Native feel |
| Icons | `lucide-react-native` or `@expo/vector-icons` | Tree-shakeable |

### Dev & CI

| Layer | Choice | Why |
|---|---|---|
| Lint | ESLint + `eslint-config-expo` | Expo-aware rules |
| Format | Prettier | No debates |
| Aliases | `@/` → `./src/` | Clean imports |
| Testing | Jest + React Native Testing Library | Test behavior, not implementation |
| E2E | Maestro | YAML-based, works with Expo |
| CI/CD | EAS Build + Submit + Update | Unified pipeline, OTA |

---

## Config

### `tsconfig.json`
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### `app.json` essentials
```json
{
  "expo": {
    "scheme": "appname",
    "newArchEnabled": true,
    "experiments": { "typedRoutes": true },
    "plugins": ["expo-router", "expo-font", "expo-image", "expo-secure-store"]
  }
}
```

### Environment Variables
- Prefix with `EXPO_PUBLIC_` for client access. Never commit `.env`. Use EAS Secrets in CI.

---

## Patterns (in order of importance)

### 1. Root Layout — Provider Stack
```tsx
// app/_layout.tsx — thin shell: providers + Slot, nothing else
import { Slot, SplashScreen } from 'expo-router';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryProvider } from '@/shared/providers/QueryProvider';
import { AuthProvider } from '@/features/auth';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium': require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync(); }, [fontsLoaded]);
  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryProvider>
          <AuthProvider>
            <Slot />
          </AuthProvider>
        </QueryProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
```

### 2. Auth Guard
```tsx
// app/(main)/_layout.tsx
import { Redirect, Stack } from 'expo-router';
import { useSession } from '@/features/auth';

export default function MainLayout() {
  const { session, isLoading } = useSession();
  if (isLoading) return null;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 3. TanStack Query Setup
```tsx
// src/shared/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### 4. Query Hook + Key Factory
```ts
// Key factory — one per feature
export const profileKeys = {
  all: ['profile'] as const,
  detail: (id: string) => [...profileKeys.all, id] as const,
};

// Hook
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '../services/profile.service';
import { profileKeys } from '../constants/profile.constants';

export function useProfile(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => getProfile(userId),
    enabled: !!userId,
  });
}
```

### 5. Mutation with Optimistic Update
```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateProfile(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfile(userId, payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: profileKeys.detail(userId) });
      const prev = qc.getQueryData(profileKeys.detail(userId));
      qc.setQueryData(profileKeys.detail(userId), (old: any) => ({ ...old, ...payload }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => qc.setQueryData(profileKeys.detail(userId), ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: profileKeys.detail(userId) }),
  });
}
```

### 6. Service Layer (backend-agnostic)
```ts
// src/features/profile/services/profile.service.ts
// Services are the ONLY files that import the backend client.
// No React imports. Pure async functions.
import { supabase } from '@/shared/lib/supabase';
import type { Profile, UpdateProfilePayload } from '../types/profile.types';

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select().single();
  if (error) throw error;
  return data;
}
```

### 7. Zustand Store
```ts
// src/shared/store/useAppStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '@/shared/lib/mmkv';

interface AppState {
  theme: 'light' | 'dark' | 'system';
  hasOnboarded: boolean;
  setTheme: (t: AppState['theme']) => void;
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
    { name: 'app-store', storage: createJSONStorage(() => zustandMMKVStorage) }
  )
);

// ALWAYS use selectors — never destructure the whole store
// ✅ const theme = useAppStore((s) => s.theme);
// ❌ const { theme } = useAppStore();
```

### 8. Form Pattern (React Hook Form + Zod)
```tsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type FormData = z.infer<typeof schema>;

export function LoginForm({ onSubmit, isLoading }: { onSubmit: (d: FormData) => void; isLoading: boolean }) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <View>
      <Controller control={control} name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput onBlur={onBlur} onChangeText={onChange} value={value}
            autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
        )}
      />
      <Button title="Sign In" onPress={handleSubmit(onSubmit)} loading={isLoading} />
    </View>
  );
}
```

### 9. Error Boundary
```tsx
// src/shared/components/ErrorBoundary.tsx
import { Component, type PropsWithChildren, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // Send to crash reporting (Sentry, etc.) in production
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: '#FFF', fontWeight: '600' },
});
```

### 10. Secure Storage (tokens & sensitive data)
```ts
// Use expo-secure-store for auth tokens, API keys, biometric-protected data
import * as SecureStore from 'expo-secure-store';

// Use MMKV for everything else (preferences, cache, non-sensitive state)
import { MMKV } from 'react-native-mmkv';
export const mmkv = new MMKV({ id: 'app-storage' });
```

---

## Performance Rules (memorize these)

1. **Lists:** `FlatList` always, never `.map()`. Use `FlashList` for 1000+ items.
2. **List items:** Wrap in `React.memo()`. Pass stable callbacks via `useCallback`.
3. **Images:** `expo-image` only. Never `Image` from `react-native`.
4. **Zustand:** Always use selectors: `useStore((s) => s.field)`.
5. **Heavy post-nav work:** `InteractionManager.runAfterInteractions()`.
6. **Avoid:** inline objects/arrays in JSX, `useMemo` on cheap ops, `ScrollView` for long lists.

---

## Testing Templates

### Query Hook Test
```ts
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProfile } from '../useProfile';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

test('returns profile data', async () => {
  const { result } = renderHook(() => useProfile('user-123'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data?.id).toBe('user-123');
});
```

### Component Render Test
```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { LoginForm } from '../LoginForm';

test('calls onSubmit with form data', async () => {
  const onSubmit = jest.fn();
  const { getByPlaceholderText, getByText } = render(<LoginForm onSubmit={onSubmit} isLoading={false} />);

  fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
  fireEvent.press(getByText('Sign In'));

  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123',
  }));
});
```

---

## Design Tokens (starter)

```ts
// src/shared/constants/theme.ts
export const COLORS = {
  primary: '#6366F1', primaryLight: '#818CF8', primaryDark: '#4F46E5',
  background: '#FFFFFF', surface: '#F9FAFB', border: '#E5E7EB',
  textPrimary: '#111827', textSecondary: '#6B7280',
  success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6',
  dark: {
    background: '#0F172A', surface: '#1E293B', border: '#334155',
    textPrimary: '#F8FAFC', textSecondary: '#94A3B8',
  },
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 } as const;
export const RADII = { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 } as const;
export const FONT = { regular: 'Inter-Regular', medium: 'Inter-Medium', semiBold: 'Inter-SemiBold', bold: 'Inter-Bold' } as const;
export const FONT_SIZE = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 } as const;
```

---

## Skill Boundaries

| This skill handles | Defer to |
|---|---|
| Which libraries + how to configure them | — |
| Coding patterns (queries, stores, forms, errors) | — |
| Folder structure | `feature-based-architecture` |
| App planning & interviews | `expo-app-architect` |
| Refactoring existing code | `rn-expo-refactor` |
| Algorithm & complexity decisions | `senior-engineer` |

---

## Checklist (run before every PR)

- [ ] Managed workflow preserved (no ejection)
- [ ] `strict: true` in tsconfig
- [ ] All server state uses TanStack Query (no `useEffect` + `fetch`)
- [ ] All forms use React Hook Form + Zod (no manual `useState` per field)
- [ ] MMKV for general storage, SecureStore for tokens/secrets
- [ ] Images use `expo-image`, not `Image`
- [ ] Services are the only files importing the backend client
- [ ] Zustand uses selectors, not full destructuring
- [ ] Error boundaries wrap the app and critical feature screens
- [ ] Env vars prefixed `EXPO_PUBLIC_`
