---
name: migrate-to-feature-architecture
description: >
  Transforms any existing React Native / Expo app into a clean, modular, feature-based
  architecture WITHOUT changing any functionality. Restructures code by domain, enforces
  strict type safety, applies senior-level best practices and optimal algorithms, and
  produces a codebase that reads like a team of senior engineers wrote it.
  Trigger this skill whenever the user says "migrate to feature architecture",
  "convert to feature-based", "restructure my app into features", "transform to modular",
  "make this codebase professional", "reorganize by feature", "this code is a mess fix the architecture",
  or "refactor into feature-based architecture".
---

# Migrate to Feature-Based Architecture Skill

## Mission
Take an existing React Native / Expo codebase — no matter how flat, messy, monolithic, or
AI-generated — and **surgically transform** it into a professional, feature-based architecture
that looks like a team of staff engineers built it. **Zero behavioral changes. Zero broken
screens. Zero lost functionality.** Only the structure, code quality, type safety, and
readability improve.

---

## The Iron Laws

> **These rules are NON-NEGOTIABLE. Violating any of them is a failed migration.**

1. **NEVER change what the app does.** Every screen, every button, every API call, every
   animation must produce the exact same user-visible result before and after migration.
2. **NEVER delete logic silently.** If code moves, annotate where it went. If code is
   genuinely dead, flag it and ask the user before removing.
3. **NEVER migrate blind.** Produce a full Migration Plan artifact and get user approval
   before touching a single file.
4. **NEVER create a feature-to-feature import.** Features are vertical slices. They
   communicate only through the shared layer.
5. **NEVER leave `any` in migrated code.** Every piece of moved code gets proper types.

---

## Phase 0 — Full Codebase Audit

Before proposing anything, perform a complete reconnaissance:

### 0.1 — Map the Current Structure
1. List every file and folder in the project (excluding `node_modules`).
2. Output an ASCII tree of the current structure.
3. Classify every file into one of: `screen`, `component`, `hook`, `service/api`, `util`,
   `constant/config`, `type/interface`, `navigation`, `store/state`, `asset`, `test`, `other`.

### 0.2 — Identify Features (Domains)
Group the classified files into logical features by asking:
- Which screens belong together? (e.g., Login + Register + ForgotPassword → `auth`)
- Which components are only used by one screen group? (Those belong to that feature)
- Which hooks serve only one domain? (Same — they belong to that feature)
- Which code is genuinely shared across 2+ features? (That goes to `/shared`)

### 0.3 — Detect Anti-Patterns
Flag these for cleanup during migration:

| Anti-Pattern | What To Do |
|---|---|
| `any` types | Replace with proper interfaces |
| Inline `fetch` / API calls in components | Extract to `feature/services/` |
| Business logic in JSX | Extract to hooks |
| Magic numbers & hardcoded colors | Extract to constants/theme |
| God components (500+ lines) | Decompose into smaller components |
| Duplicated logic across screens | Consolidate into shared hooks/utils |
| `console.log` scattered everywhere | Remove or wrap in `__DEV__` guard |
| Unused imports / dead code | Remove (with user confirmation) |
| `.then().catch()` chains | Convert to `async/await` with `try/catch` |
| Mutable state mutations | Replace with immutable patterns |
| `O(N²)` loops with available `O(N)` alternatives | Replace with Maps/Sets |
| Missing error handling | Add proper `try/catch` and error states |
| Array `.find()` / `.filter()` inside `.map()` | Pre-index with Map/Set for `O(1)` lookups |
| Inline functions in render (heavy children) | Extract and memoize where appropriate |

### 0.4 — Dependency Map
Trace which files import which other files. This reveals:
- Hidden circular dependencies
- Files that are imported by everything (candidates for `/shared`)
- Files that are imported by nothing (dead code candidates)

---

## Phase 1 — The Migration Plan (USER MUST APPROVE)

Produce an `implementation_plan.md` artifact (with `request_feedback = true`) containing:

### 1.1 — Current State Summary
- ASCII tree of current structure
- Total file count and rough line count
- Identified features with their files
- List of detected anti-patterns

### 1.2 — Target Structure
Show the exact target folder structure:

```
/app                            # Expo Router — routing shells ONLY
  /(tabs)/
    _layout.tsx
    index.tsx
    [feature].tsx
  /[stack-screens]/
    [screen].tsx

/src
  /features/
    /[feature-name]/
      components/
      hooks/
      services/
      types/
      constants/
      utils/
      index.ts                  # barrel export

  /shared/
    /components/                # Cross-feature UI atoms
    /hooks/                     # Cross-cutting hooks
    /services/                  # API client, storage
    /store/                     # Global state
    /types/                     # App-wide types
    /constants/                 # Theme, config
    /utils/                     # Pure helpers
```

### 1.3 — File Migration Map
A table showing every file's journey:

| Current Path | Target Path | Action |
|---|---|---|
| `screens/LoginScreen.tsx` | `src/features/auth/components/LoginForm.tsx` | Move + refactor |
| `components/Button.tsx` | `src/shared/components/Button.tsx` | Move (used by 3+ features) |
| `hooks/useAuth.ts` | `src/features/auth/hooks/useAuth.ts` | Move + type-harden |
| `utils/helpers.ts` | Split into feature-specific utils | Decompose |
| `api/chatApi.ts` | `src/features/chat/services/chat.service.ts` | Move + refactor |

### 1.4 — Migration Order
Specify the exact order of operations to avoid breakage:

```
1. Create target folder structure (empty)
2. Migrate /shared layer first (constants, theme, API client, shared components)
3. Migrate features one at a time, in dependency order:
   a. Feature with zero dependencies on other features first
   b. Features that depend on shared state last
4. Rewire route files (/app) to import from new feature locations
5. Delete old empty folders
6. Final verification pass
```

### 1.5 — Risk Assessment
Flag any risky migrations:
- Files with complex circular dependencies
- Files with deep integration into navigation state
- Files that monkey-patch global objects
- Third-party library wrappers with implicit side effects

---

## Phase 2 — Shared Layer Migration

Migrate in this exact order. After each step, verify the app still compiles.

### 2.1 — Constants & Theme
```ts
// src/shared/constants/theme.ts
export const COLORS = {
  // Extract ALL hex codes / color values from entire codebase
  primary: '#4F46E5',
  primaryLight: '#818CF8',
  background: '#0F172A',
  surface: '#1E293B',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  border: '#334155',
  error: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
} as const;

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 10, sm: 12, md: 14, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const;

export const RADII = {
  sm: 4, md: 8, lg: 16, xl: 24, pill: 9999,
} as const;
```

**Rule:** Search the ENTIRE codebase for every raw hex code, magic number in padding/margin/fontSize/borderRadius, and replace them with these tokens. Not a single magic number survives.

### 2.2 — API Client
```ts
// src/shared/services/api.client.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const response = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', ...fetchOptions.headers },
    ...fetchOptions,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string>) =>
    request<T>(path, { method: 'GET', params }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
};
```

**Rule:** If the app uses Supabase, Firebase, or another SDK, create a typed wrapper in `/shared/services/` instead. All feature services import from this shared client — NEVER call `fetch` or the SDK directly from components or hooks.

### 2.3 — Shared Components
Move components that are used by **2 or more features**:
- `Button`, `Card`, `Typography`, `Input`, `Modal`, `LoadingSpinner`, `ErrorMessage`
- Each component gets proper TypeScript `interface` for its props
- Each component uses theme tokens exclusively (no magic numbers)

### 2.4 — Global Store
Migrate global state (current user, auth token, theme mode, app-wide settings) to
`/shared/store/`. If the app uses Context without a state library, consider consolidating
into Zustand for simplicity. If Zustand/Redux/etc. already exists, just move the files.

### 2.5 — Shared Barrel Exports
Every subfolder of `/shared` gets an `index.ts`:
```ts
// src/shared/components/index.ts
export { Button } from './Button';
export { Typography } from './Typography';
export { Card } from './Card';
// ...
```

---

## Phase 3 — Feature-by-Feature Migration

### The Process (repeat for EACH feature)

#### Step 1: Create the Feature Folder
```
src/features/<feature-name>/
  components/
  hooks/
  services/
  types/
  constants/    (only if the feature has feature-specific constants)
  utils/        (only if the feature has feature-specific utilities)
  index.ts
```

#### Step 2: Define Types FIRST
Before moving any logic, define the TypeScript interfaces for this feature's domain:

```ts
// src/features/chat/types/chat.types.ts
export interface Message {
  readonly id: string;
  readonly channelId: string;
  readonly senderId: string;
  readonly text: string;
  readonly createdAt: string;
  readonly status: MessageStatus;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface SendMessagePayload {
  readonly channelId: string;
  readonly text: string;
}
```

**Rules for typing:**
- Use `readonly` on all properties that shouldn't be mutated
- Use discriminated unions for state machines (`status: 'idle' | 'loading' | 'success' | 'error'`)
- Use `Pick`, `Omit`, `Partial` to derive types — never duplicate fields
- Zero `any` — if the shape is unknown, use `unknown` + type guard
- Explicit return types on every function

#### Step 3: Extract Services
Move all API / data-access logic for this feature into `services/`:

**BEFORE (anti-pattern — fetch inside component):**
```tsx
// ❌ Old: screens/ChatScreen.tsx
function ChatScreen() {
  useEffect(() => {
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data));
  }, []);
}
```

**AFTER (clean service layer):**
```ts
// ✅ New: src/features/chat/services/chat.service.ts
import { apiClient } from '@/shared/services/api.client';
import type { Message, SendMessagePayload } from '../types/chat.types';

export async function getMessages(channelId: string): Promise<Message[]> {
  return apiClient.get<Message[]>(`/channels/${channelId}/messages`);
}

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  return apiClient.post<Message>('/messages', payload);
}
```

#### Step 4: Extract & Harden Hooks
Move stateful logic out of screens/components into hooks. Apply these upgrades:

**BEFORE (fragile, untyped, no error handling):**
```tsx
// ❌ Old: screens/ChatScreen.tsx
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/messages')
    .then(r => r.json())
    .then(d => { setMessages(d); setLoading(false); });
}, []);
```

**AFTER (typed, safe, senior-grade):**
```ts
// ✅ New: src/features/chat/hooks/useMessages.ts
import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '../services/chat.service';
import type { Message } from '../types/chat.types';

interface UseMessagesResult {
  readonly messages: readonly Message[];
  readonly loading: boolean;
  readonly error: Error | null;
  readonly refetch: () => Promise<void>;
}

export function useMessages(channelId: string): UseMessagesResult {
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMessages(channelId);
      setMessages(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load messages'));
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { messages, loading, error, refetch: fetch } as const;
}
```

**Hook quality upgrades to apply during migration:**

| Before | After | Why |
|---|---|---|
| No error handling | `try/catch` with typed `Error` | Reliability |
| No loading state | Proper `loading` boolean | UX |
| No refetch capability | Expose `refetch` function | Flexibility |
| Untyped return | Explicit return interface | Readability |
| Missing cleanup | Abort controller or `cancelled` flag | Prevent stale updates |
| `.then()` chains | `async/await` | Readability |

#### Step 5: Migrate Components
Move screen-specific components into the feature's `components/` folder. Apply these upgrades:

**Quality upgrades to apply to every component:**

| Before | After | Why |
|---|---|---|
| `style={{ marginTop: 16, color: '#333' }}` | `style={styles.container}` with `SPACING.md` and `COLORS.text` | Design system compliance |
| `export default function` | `export function` (named exports) | Better refactoring & tree-shaking |
| Props typed inline or not at all | Dedicated `interface` above the component | Readability |
| 300-line god component | Decomposed into sub-components | Single responsibility |
| Inline anonymous functions in render | Extracted to `const` or `useCallback` | Performance (heavy children) |
| `.map()` for long lists | `FlatList` with `keyExtractor` | Performance |
| Raw `<Text>` with manual styles | Shared `<Typography>` component | Consistency |

#### Step 6: Create the Barrel Export
```ts
// src/features/chat/index.ts
// Components
export { ChatList } from './components/ChatList';
export { ChatBubble } from './components/ChatBubble';
export { ChatInput } from './components/ChatInput';

// Hooks
export { useMessages } from './hooks/useMessages';
export { useSendMessage } from './hooks/useSendMessage';

// Types
export type { Message, SendMessagePayload } from './types/chat.types';
```

**Rule:** Only export what the routing layer or other features need. Internal helper components stay private.

#### Step 7: Rewire the Route
```tsx
// app/(tabs)/chat.tsx — THIN SHELL
import { ChatList } from '@/src/features/chat';

export default function ChatScreen() {
  return <ChatList />;
}
```

**Rule:** Route files contain ZERO business logic, ZERO hooks, ZERO state. They are pure wiring.

---

## Phase 4 — Algorithm & Performance Upgrades

While migrating, upgrade algorithms wherever a better option exists. These are **not behavior changes** — they produce the same output faster.

### Lookup Optimization
```ts
// ❌ O(N×M) — nested find inside map
const enriched = orders.map(order => ({
  ...order,
  user: users.find(u => u.id === order.userId),
}));

// ✅ O(N+M) — pre-index with Map
const userMap = new Map(users.map(u => [u.id, u]));
const enriched = orders.map(order => ({
  ...order,
  user: userMap.get(order.userId),
}));
```

### Deduplication
```ts
// ❌ O(N²) — filter with indexOf
const unique = items.filter((item, i) => items.indexOf(item) === i);

// ✅ O(N) — Set
const unique = [...new Set(items)];
```

### Membership Checks
```ts
// ❌ O(N) per check — array includes in a loop
items.forEach(item => {
  if (allowedIds.includes(item.id)) { /* ... */ }
});

// ✅ O(1) per check — Set
const allowedSet = new Set(allowedIds);
items.forEach(item => {
  if (allowedSet.has(item.id)) { /* ... */ }
});
```

### List Rendering
```tsx
// ❌ Renders all items at once — kills memory on long lists
{messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}

// ✅ Virtualized — renders only visible items
<FlatList
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ChatBubble message={item} />}
  initialNumToRender={15}
  maxToRenderPerBatch={10}
  windowSize={5}
/>
```

### Memoization (only where it matters)
```tsx
// ✅ Memoize expensive derived data
const sortedMessages = useMemo(
  () => [...messages].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [messages]
);

// ✅ Memoize callbacks passed to memoized children
const handlePress = useCallback((id: string) => {
  navigation.navigate('Detail', { id });
}, [navigation]);

// ✅ Memoize heavy list items
export const ChatBubble = React.memo(function ChatBubble({ message }: Props) {
  // ...
});
```

**Rule:** Only memoize when there is a measurable benefit — passing callbacks/data to `React.memo` children, or expensive computations. Do not spray `useMemo` everywhere.

---

## Phase 5 — Type Safety Hardening

Apply these upgrades across ALL migrated code:

### 1. Replace `any` with proper types
```ts
// ❌
const handleResponse = (data: any) => { ... }

// ✅
interface ApiResponse<T> {
  readonly data: T;
  readonly status: number;
}
const handleResponse = <T>(response: ApiResponse<T>): T => response.data;
```

### 2. Discriminated Unions for State
```ts
// ❌ Multiple booleans — allows impossible states (loading AND error)
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [data, setData] = useState(null);

// ✅ Discriminated union — impossible states are unrepresentable
type AsyncState<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'error'; readonly error: Error };
```

### 3. Strict Null Handling
```ts
// ❌ Non-null assertion — crashes at runtime if null
const name = user!.name;

// ✅ Safe access with fallback
const name = user?.name ?? 'Unknown';
```

### 4. `readonly` for Immutability
```ts
// ❌ Mutable — allows accidental state mutation
interface User {
  id: string;
  name: string;
  tags: string[];
}

// ✅ Immutable — compiler prevents mutation
interface User {
  readonly id: string;
  readonly name: string;
  readonly tags: readonly string[];
}
```

### 5. Explicit Return Types
```ts
// ❌ Implicit — return type can drift silently
function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

// ✅ Explicit — compiler catches drift
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString();
}
```

---

## Phase 6 — Verification & Cleanup

### 6.1 — Dependency Rule Audit
Run a mental (or grep-based) check:

```
✅ app/ → imports from src/features/  (allowed)
✅ features/ → imports from shared/  (allowed)
✅ features/chat → imports within features/chat  (allowed)
❌ features/chat → imports from features/auth  (VIOLATION — fix it)
❌ shared/ → imports from features/  (VIOLATION — fix it)
```

### 6.2 — Compile Check
Ensure `npx tsc --noEmit` passes with zero errors and zero warnings.

### 6.3 — Delete Empty Folders
After all files have moved, delete the old empty folders (`/screens`, `/components`, `/hooks`, `/services`, `/utils`, etc.).

### 6.4 — Barrel Export Completeness
Verify every feature's `index.ts` exports everything the route layer needs.

### 6.5 — Output the Migration Report
Produce a final `walkthrough.md` artifact with:
- Before/After folder trees side-by-side
- Full file migration map (old path → new path)
- List of anti-patterns fixed (with before/after snippets)
- Algorithm upgrades applied
- Type safety improvements made
- Any remaining tech debt or known limitations

---

## Migration Order — One Feature at a Time

**CRITICAL:** Migrate one feature completely before starting the next. After each feature:
1. Verify the app compiles (`npx tsc --noEmit`)
2. Verify the migrated screens render correctly
3. Verify no broken imports remain
4. Commit (if using git)

Then move to the next feature.

**Suggested order:**
1. Constants / Theme (shared layer foundation)
2. Shared components (UI atoms)
3. API client (shared services)
4. Global store (shared state)
5. Simplest feature first (fewest files, fewest dependencies)
6. Most complex feature last
7. Route layer rewiring
8. Cleanup pass (delete old folders, verify imports)

---

## Safety Checklist (Run BEFORE Delivering)

- [ ] Does every screen render the exact same UI as before migration?
- [ ] Does every button/interaction produce the exact same behavior?
- [ ] Does every API call send the exact same request and handle the response the same way?
- [ ] Are there ZERO `any` types in the migrated code?
- [ ] Are there ZERO magic numbers or hardcoded colors?
- [ ] Are there ZERO feature-to-feature imports?
- [ ] Does every feature have a barrel `index.ts`?
- [ ] Are route files thin shells (< 10 lines, no logic)?
- [ ] Are services free of React imports?
- [ ] Does `npx tsc --noEmit` pass with zero errors?
- [ ] Can any single feature folder be deleted without breaking other features?
- [ ] Would a senior engineer approve this code in a PR review?

---

## What This Skill Does NOT Do

- Add new features or screens (use `expo-app-architect` + `feature-based-architecture` skills)
- Scaffold a brand-new app from scratch (use `feature-based-architecture` skill)
- Change the UI design or visual appearance (use `design-system` skill)
- Upgrade dependencies or Expo SDK versions
- Migrate to a different state management library (unless the user explicitly asks)
- Set up CI/CD, testing frameworks, or deployment pipelines

This skill focuses **strictly** on transforming the existing codebase structure, code quality,
type safety, and algorithmic efficiency — while preserving 100% of existing functionality.
