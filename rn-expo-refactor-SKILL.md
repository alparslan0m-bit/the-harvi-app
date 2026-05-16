---
name: rn-expo-refactor
description: >
  Refactor React Native Expo app code to be modular, maintainable, and scalable — WITHOUT changing any functionality.
  Trigger this skill whenever the user wants to clean up, restructure, reorganize, or improve the architecture of a React Native or Expo project.
  Also use when they say "make it maintainable", "make it scalable", "make it modular", "clean up the code", "organize the files",
  "anyone should understand this", or "refactor without breaking anything".
  This skill is critical for AI-generated code that works but is messy, monolithic, or hard to read.
---

# React Native / Expo Refactor Skill

## Mission
Restructure and clean up working React Native / Expo code into a professional, readable, team-friendly codebase.
**The #1 rule: NEVER change behavior. Every refactor step must be provably safe.**

---

## Phase 0 — Understand Before Touching

Before writing a single line, ask the user to share:
1. The current file/folder structure (or a zip / paste of files)
2. Which screens / features exist
3. Any libraries already in use (navigation, state, UI, etc.)
4. Any existing patterns they want to keep

Then produce a **Refactor Plan** (written, bullet list) for the user to approve **before** making changes.

---

## Phase 1 — Folder Structure

Establish this standard layout (adjust to project size):

```
/src
  /components        # Reusable UI pieces (Button, Card, Modal…)
  /screens           # One file per screen
  /navigation        # All React Navigation config
  /hooks             # Custom hooks (useAuth, useFetch, useForm…)
  /services          # API calls, AsyncStorage, external SDKs
  /store             # State management (Context, Zustand, Redux…)
  /utils             # Pure helper functions, formatters, validators
  /constants         # Colors, fonts, sizes, API URLs, enums
  /types             # TypeScript interfaces & types (if TS project)
  /assets            # Images, fonts, icons (already exists usually)
App.js / App.tsx     # Entry point only — thin shell
```

**Rules:**
- Each folder has an `index.js` (barrel export) so imports stay clean.
- No logic inside `App.js` — only providers and the root navigator.
- Never mix screen logic with reusable component logic.

---

## Phase 2 — Component Extraction

### What to extract
| Pattern to find | Extract into |
|---|---|
| JSX block > ~40 lines | New component in `/components` |
| Repeated JSX across screens | Shared component |
| Inline styles block | `StyleSheet` at bottom of file, or `/constants/styles.js` |
| Magic numbers / hex colors | `/constants/colors.js` and `/constants/layout.js` |
| `console.log` debug statements | Remove or wrap in `__DEV__` guard |

### Component file template
```jsx
// components/MyComponent.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function MyComponent({ prop1, prop2 }) {
  return (
    <View style={styles.container}>
      {/* JSX here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // ...
  },
});
```

---

## Phase 3 — Custom Hooks

Move all stateful logic out of screens into hooks.

### Signs that logic belongs in a hook
- `useState` + `useEffect` combo that fetches data
- Form state management
- Auth state / user session
- Any logic copy-pasted across screens

### Hook template
```js
// hooks/useMyData.js
import { useState, useEffect } from 'react';

export function useMyData(param) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchSomething(param);
        if (!cancelled) setData(result);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [param]);

  return { data, loading, error };
}
```

---

## Phase 4 — Services Layer

All network calls and device APIs go in `/services`. Screens and hooks **never** call `fetch` directly.

```js
// services/api.js
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.example.com';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  getItems: () => request('/items'),
  createItem: (body) => request('/items', { method: 'POST', body: JSON.stringify(body) }),
};
```

---

## Phase 5 — Constants & Theme

```js
// constants/colors.js
export const COLORS = {
  primary: '#4F46E5',
  background: '#F9FAFB',
  text: '#111827',
  error: '#EF4444',
};

// constants/layout.js
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const FONT_SIZE = { sm: 12, md: 14, lg: 16, xl: 20, xxl: 28 };

// constants/index.js  (barrel)
export * from './colors';
export * from './layout';
```

---

## Phase 6 — Navigation

Keep all navigation in `/navigation`.

```js
// navigation/AppNavigator.js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import DetailScreen from '../screens/DetailScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

---

## Phase 7 — Screen Template

After refactoring, each screen should look like this — thin, readable, no inline logic:

```jsx
// screens/HomeScreen.js
import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { useItems } from '../hooks/useItems';
import { COLORS, SPACING } from '../constants';

export default function HomeScreen({ navigation }) {
  const { items, loading, error } = useItems();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ItemCard item={item} onPress={() => navigation.navigate('Detail', { id: item.id })} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
});
```

---

## Phase 8 — Code Quality Rules

Apply these consistently, file by file:

| Rule | Why |
|---|---|
| One component per file | Easy to find, test, and reuse |
| Named exports for utilities, default exports for components/screens | Standard convention |
| Props destructured in function signature | Readable at a glance |
| No anonymous arrow functions in JSX render (when avoidable) | Prevents re-render issues |
| `key` prop always on list items, never use `index` if data has an id | Prevents bugs |
| `StyleSheet.create()` always — no inline style objects | Performance + readability |
| No hardcoded strings in JSX — use constants or i18n | Scalability |
| `async/await` over `.then().catch()` chains | Readability |
| Wrap risky operations in `try/catch` | Reliability |
| Remove dead code, commented-out blocks, unused imports | Cleanliness |

---

## Phase 9 — Barrel Exports (index.js per folder)

Each folder gets an `index.js` so imports are short:

```js
// components/index.js
export { default as Button } from './Button';
export { default as Card } from './Card';
export { default as LoadingSpinner } from './LoadingSpinner';
```

Now screens import like: `import { Button, Card } from '../components';`

---

## Delivery Format

When outputting refactored code, always:

1. **Show the new folder structure first** (ASCII tree)
2. **Output files one at a time**, each with its full path as a comment on line 1
3. **Highlight every change** with a brief comment: `// extracted from HomeScreen`
4. **Never silently delete logic** — if something is removed, note where it moved
5. **End with a migration checklist** the developer can follow step-by-step

---

## Safety Checklist (run mentally before every output)

- [ ] Does this change any function's behavior?
- [ ] Does this change any API call, parameter, or response handling?
- [ ] Does this change any navigation route name or param?
- [ ] Does this change any state shape or side effect?
- [ ] Does this change any UI output the user sees?

If any answer is YES → do not make that change, or explicitly flag it and ask the user.

---

## What This Skill Does NOT Do

- Fix bugs (unless the user asks)
- Add new features
- Change UI design
- Migrate to TypeScript (unless asked)
- Change state management library (unless asked)
- Upgrade dependencies

Stick strictly to structure, readability, and organization.
