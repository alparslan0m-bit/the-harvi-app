---
name: feature-based-architecture
description: >
  Scaffolds and builds any new application using Feature-Based Architecture — code grouped by
  domain/feature rather than by file type. Produces clean, modular, maintainable, and readable
  codebases that scale from solo projects to large teams.
  Trigger this skill whenever the user says "build with feature-based architecture",
  "use feature architecture", "domain-driven folder structure", "modular architecture",
  "build me a clean app", "scalable project structure", or "feature-first architecture".
  Works with React Native / Expo, Next.js, Vite + React, and plain TypeScript projects.
---

# Feature-Based Architecture Skill

## Mission
Build any new application with a **feature-based (domain-driven) folder structure** where every
feature is a self-contained vertical slice — owning its own components, hooks, services, types,
and constants. The result is a codebase that any developer can navigate by feature name, modify
one feature without touching others, and delete an entire feature by removing a single folder.

---

## Why Feature-Based Over Flat?

| Flat (by type) | Feature-Based (by domain) |
|---|---|
| `/components/Button.js, UserCard.js, ChatBubble.js` | `/features/chat/components/ChatBubble.tsx` |
| `/hooks/useAuth.js, useChat.js, useProducts.js` | `/features/auth/hooks/useAuth.ts` |
| Every folder grows linearly with every new feature | Each feature stays small and self-contained |
| Changing one feature requires touching 5+ folders | Changing one feature = one folder |
| Deleting a feature leaves orphans everywhere | Deleting a feature = `rm -rf features/chat` |

---

## Core Principles

1. **Features Own Their Code**
   - A feature folder contains EVERYTHING that feature needs: components, hooks, services, types, utils, and constants. If only one feature uses it, it lives inside that feature.

2. **Shared Is Earned, Not Default**
   - Code starts inside a feature. It only moves to `/shared` when a **second** feature genuinely needs it. Never create shared abstractions preemptively.

3. **One-Way Dependencies**
   - Features may import from `/shared`. Features **NEVER** import from other features. If two features need to communicate, use shared state (store), events, or lift the shared logic to `/shared`.

4. **Public API via Barrel Exports**
   - Each feature exposes only what outsiders need through its `index.ts` barrel file. Internal implementation files are private by convention.

5. **Consistent Anatomy**
   - Every feature follows the exact same internal folder structure. Consistency beats creativity in architecture.

---

## The Folder Structure

### React Native / Expo (with Expo Router)

```
/app                          # Expo Router — routing ONLY, no logic
  /(tabs)/
    _layout.tsx
    index.tsx                  # imports from features/home
    chat.tsx                   # imports from features/chat
    profile.tsx                # imports from features/profile
  /auth/
    login.tsx                  # imports from features/auth
    register.tsx

/src
  /features                   # ← THE CORE — one folder per domain
    /auth/
      components/
        LoginForm.tsx
        RegisterForm.tsx
      hooks/
        useAuth.ts
        useSession.ts
      services/
        auth.service.ts
      types/
        auth.types.ts
      constants/
        auth.constants.ts
      utils/
        validators.ts
      index.ts                # public barrel: export { LoginForm, useAuth, ... }

    /chat/
      components/
        ChatBubble.tsx
        ChatInput.tsx
        ChatList.tsx
      hooks/
        useMessages.ts
        useSendMessage.ts
      services/
        chat.service.ts
      types/
        chat.types.ts
      index.ts

    /profile/
      components/
        ProfileHeader.tsx
        ProfileStats.tsx
      hooks/
        useProfile.ts
      services/
        profile.service.ts
      types/
        profile.types.ts
      index.ts

    /home/
      components/
        HomeHero.tsx
        FeedCard.tsx
      hooks/
        useFeed.ts
      index.ts

  /shared                     # ← ONLY truly cross-feature code
    /components/              # Reusable UI atoms (Button, Card, Modal, Typography)
      Button.tsx
      Card.tsx
      Typography.tsx
      index.ts
    /hooks/                   # Cross-cutting hooks (useNetworkStatus, useDebounce)
      useDebounce.ts
      index.ts
    /services/                # API client, storage wrapper
      api.client.ts
      storage.ts
      index.ts
    /store/                   # Global state (Zustand / Redux / Context)
      useAppStore.ts
      index.ts
    /types/                   # App-wide types (User, ApiResponse, etc.)
      common.types.ts
      index.ts
    /constants/               # Theme, colors, spacing, config
      theme.ts
      config.ts
      index.ts
    /utils/                   # Pure helpers (formatDate, clamp, debounce)
      formatters.ts
      index.ts
```

### Next.js / Vite + React (Web)

```
/app (or /pages)              # Routing layer — thin shells only
  /page.tsx
  /chat/page.tsx
  /profile/page.tsx

/src
  /features/                  # Same pattern as above
    /auth/
      components/
      hooks/
      services/
      types/
      index.ts
    /dashboard/
      ...
  /shared/
    /components/
    /hooks/
    /services/
    /store/
    /types/
    /constants/
    /utils/
```

---

## Feature Anatomy — Deep Dive

Every feature follows this exact internal structure. Only create subfolders that have files — skip empty ones.

### `components/` — UI Pieces
- One component per file.
- Component name matches filename: `ChatBubble.tsx` → `export function ChatBubble()`.
- Components are **dumb** — they receive data via props and call callbacks. No direct API calls.
- Styles live in the same file (`StyleSheet.create` or CSS module).

### `hooks/` — Stateful Logic
- Each hook encapsulates one concern: data fetching, form state, or a specific behavior.
- Hooks call services, not `fetch` directly.
- Always return a clear interface: `{ data, loading, error, refetch }`.

### `services/` — Data Access
- Pure functions that talk to the API, database, or device APIs.
- No React imports. No hooks. Just async functions.
- Import the shared `api.client` for HTTP calls.

### `types/` — TypeScript Interfaces
- All types scoped to this feature.
- Exported so hooks and components can import them.

### `constants/` — Feature-Specific Config
- Enums, magic strings, feature flags, validation rules.

### `utils/` — Pure Helpers
- Stateless utility functions scoped to this feature.
- If a second feature needs it, move it to `/shared/utils/`.

### `index.ts` — The Public Barrel
```ts
// features/auth/index.ts — THE ONLY file other code should import from
export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { useAuth } from './hooks/useAuth';
export { useSession } from './hooks/useSession';
export type { User, AuthState } from './types/auth.types';
```

---

## Dependency Rules (ENFORCED)

```
                  ┌─────────────┐
                  │   /app      │  (routing layer — imports features)
                  └──────┬──────┘
                         │ imports
                         ▼
              ┌──────────────────────┐
              │     /features/*      │  (each feature is self-contained)
              └──────────┬───────────┘
                         │ imports
                         ▼
              ┌──────────────────────┐
              │       /shared        │  (common utilities, UI atoms, store)
              └──────────────────────┘
```

| Rule | Allowed | Forbidden |
|---|---|---|
| Route → Feature | ✅ `app/chat.tsx` imports `features/chat` | |
| Feature → Shared | ✅ `features/chat` imports `shared/components` | |
| Feature → Feature | | ❌ `features/chat` imports `features/auth` |
| Shared → Feature | | ❌ `shared/hooks` imports `features/chat` |
| Within Feature | ✅ `chat/hooks` imports `chat/services` | |

**If two features need to share data:** Use the global store (`/shared/store/`). Feature A writes, Feature B reads. They never import each other.

---

## Execution Workflow

### Phase 0: Requirements Gathering
Before writing code, ask the user:
1. What features/domains does the app have? (e.g., auth, chat, profile, payments)
2. What platform? (React Native/Expo, Next.js, Vite)
3. What state management? (Zustand, Redux Toolkit, Context)
4. What backend? (Supabase, Firebase, REST API, none yet)
5. TypeScript? (Default: YES)

### Phase 1: Scaffold the Structure
1. Create the root folder structure: `/app`, `/src/features`, `/src/shared`.
2. Create one feature folder per domain identified in Phase 0.
3. Create the `/shared` layer with theme, API client, and core UI atoms.
4. Add barrel `index.ts` files in every folder.

### Phase 2: Build the Shared Layer First
1. **Theme & Constants** — Colors, spacing, typography tokens.
2. **API Client** — A configured HTTP client or Supabase/Firebase client.
3. **Core UI Atoms** — `Button`, `Typography`, `Card`, `Input`, `LoadingSpinner`, `ErrorMessage`.
4. **Global Store** — App-wide state (current user, theme mode, network status).

### Phase 3: Build Features One-by-One
For each feature, build in this order:
1. `types/` — Define the data shapes first.
2. `services/` — Implement the data access layer.
3. `hooks/` — Wire services into React hooks.
4. `components/` — Build the UI using hooks + shared atoms.
5. `index.ts` — Export the public API.
6. Wire the feature into the routing layer (`/app`).

### Phase 4: Integration & Polish
1. Connect features to the global store where needed.
2. Add navigation between features via the routing layer.
3. Verify no feature-to-feature imports exist.
4. Verify every import from a feature goes through its `index.ts`.

---

## File Templates

### Service Template
```ts
// features/chat/services/chat.service.ts
import { apiClient } from '@/shared/services/api.client';
import type { Message, SendMessagePayload } from '../types/chat.types';

export async function getMessages(channelId: string): Promise<Message[]> {
  return apiClient.get(`/channels/${channelId}/messages`);
}

export async function sendMessage(payload: SendMessagePayload): Promise<Message> {
  return apiClient.post('/messages', payload);
}
```

### Hook Template
```ts
// features/chat/hooks/useMessages.ts
import { useState, useEffect, useCallback } from 'react';
import { getMessages } from '../services/chat.service';
import type { Message } from '../types/chat.types';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
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

  return { messages, loading, error, refetch: fetch };
}
```

### Component Template
```tsx
// features/chat/components/ChatBubble.tsx
import { View, StyleSheet } from 'react-native';
import { Typography } from '@/shared/components';
import { COLORS, SPACING, RADII } from '@/shared/constants';
import type { Message } from '../types/chat.types';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
}

export function ChatBubble({ message, isOwn }: ChatBubbleProps) {
  return (
    <View style={[styles.bubble, isOwn ? styles.own : styles.other]}>
      <Typography variant="body">{message.text}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    padding: SPACING.md,
    borderRadius: RADII.lg,
    maxWidth: '80%',
    marginBottom: SPACING.sm,
  },
  own: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surface,
  },
});
```

### Types Template
```ts
// features/chat/types/chat.types.ts
export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface SendMessagePayload {
  channelId: string;
  text: string;
}
```

### Barrel Export Template
```ts
// features/chat/index.ts
export { ChatList } from './components/ChatList';
export { ChatBubble } from './components/ChatBubble';
export { ChatInput } from './components/ChatInput';
export { useMessages } from './hooks/useMessages';
export { useSendMessage } from './hooks/useSendMessage';
export type { Message, SendMessagePayload } from './types/chat.types';
```

### Route Shell Template (Expo Router)
```tsx
// app/(tabs)/chat.tsx — THIN SHELL, no logic here
import { ChatList } from '@/src/features/chat';

export default function ChatScreen() {
  return <ChatList />;
}
```

---

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Feature folder | `kebab-case` | `in-app-purchases/` |
| Component file | `PascalCase.tsx` | `ChatBubble.tsx` |
| Hook file | `camelCase.ts` with `use` prefix | `useMessages.ts` |
| Service file | `kebab-case.service.ts` | `chat.service.ts` |
| Types file | `kebab-case.types.ts` | `chat.types.ts` |
| Constants file | `kebab-case.constants.ts` | `chat.constants.ts` |
| Utils file | `camelCase.ts` | `formatTimestamp.ts` |
| Barrel export | `index.ts` | Always `index.ts` |

---

## Adding a New Feature (Checklist)

When the user asks to add a new feature to an existing feature-based project:

1. `mkdir src/features/<feature-name>/`
2. Create subfolders: `components/`, `hooks/`, `services/`, `types/`
3. Define types first → build service → build hook → build components
4. Create `index.ts` barrel
5. Add route in `/app`
6. Verify: no imports to or from other features

---

## Code Quality Rules

| Rule | Why |
|---|---|
| One component per file | Easy to find, test, replace |
| No logic in route files | Routes are wiring, not behavior |
| Services have zero React imports | Keeps data layer framework-agnostic |
| Hooks return typed objects, not tuples | Readable and refactor-safe |
| No `any` type — ever | Type safety is non-negotiable |
| Barrel exports only public API | Encapsulation by convention |
| Feature folders never import other features | Independence and deletability |
| Shared code is extracted, not preemptively created | Avoid premature abstraction |

---

## Safety & Quality Checks

- [ ] Is every feature fully self-contained (components, hooks, services, types in one folder)?
- [ ] Does the `/shared` layer contain ONLY genuinely cross-feature code?
- [ ] Are there ZERO imports between feature folders?
- [ ] Does every feature have a barrel `index.ts` that defines its public API?
- [ ] Are route files thin shells that import from features?
- [ ] Are services free of any React imports?
- [ ] Is the naming convention consistent across all features?
- [ ] Can any single feature folder be deleted without breaking other features?

---

## What This Skill Does NOT Do

- Refactor existing flat-structure code (use the `rn-expo-refactor` skill for that)
- Make backend architecture decisions
- Choose UI libraries or design systems (use the `design-system` skill for that)
- Perform performance audits (use the `performance-auditor` skill for that)

This skill focuses strictly on **scaffolding and building new apps with clean, modular, feature-based architecture**.
