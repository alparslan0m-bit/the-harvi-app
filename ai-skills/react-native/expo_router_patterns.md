# Expo Router: File-Based Navigation & Page Gates

This document defines the routing standards, stack navigation setups, and screen parameter passing rules of the Harvi application.

---

## 1. Directory Route Structure

Expo Router maps routes to the filesystem structure inside `app/`. The project structures pages to cleanly isolate tabs, stacks, dynamic routes, and modals:

```
app/
├── (tabs)/                  # Logged-in navigation tabs root
│   ├── (learn)/             # Learning path directory
│   │   ├── [subjectId].tsx  # Subject details route (Dynamic path parameters)
│   │   └── index.tsx        # Dashboard root listing modules
│   ├── stats.tsx            # Dashboard metrics page
│   ├── profile.tsx          # Profile panel
│   └── _layout.tsx          # Tab bar layout configurations
├── auth/                    # OAuth processing routes
│   └── callback.tsx         # PKCE/Implicit token receiver redirect page
├── purchase/                # Billing checkout directory
│   └── [moduleId].tsx       # stripe overlay launcher modal
├── quiz/                    # Quiz session stack
│   └── [lectureId].tsx      # Active spring quiz route
├── _layout.tsx              # Root application layout provider
└── +not-found.tsx           # Wildcard page fallback
```

---

## 2. Dynamic Parameters Passing

When navigating to dynamic routes (like `quiz/[lectureId]`), route hooks parse identifiers directly:

```typescript
import { useLocalSearchParams } from "expo-router";

export default function ActiveQuiz() {
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();

  if (!lectureId) {
    return <QuizErrorScreen message="Missing lecture identification parameters" />;
  }

  // Load active quiz using the lectureId parameter...
}
```

---

## 3. Strict Navigation Gates (Auth Gating)

To prevent logged-out users from loading protected pages, the application handles dynamic routing gates inside the root navigation layer:

```typescript
// app/_layout.tsx
import { useAuth } from "@/context/AuthContext";
import { router, useSegments } from "expo-router";
import { useEffect } from "react";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";

    if (!user && !inAuthGroup) {
      // Direct logged-out users to authentication screens
      router.replace("/auth");
    } else if (user && inAuthGroup) {
      // Direct authenticated users out of auth screens to the main interface
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) return null;
  
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

---

## 4. Routing Best Practices

1.  **Always type search params**: Define parameter interfaces explicitly when invoking `useLocalSearchParams` to guarantee types inside component bodies.
2.  **Use `useSegments` for Gating**: Rely on segment arrays rather than exact path strings (`usePathname`) for authentication checks. Segment checking protects nested routes (e.g. `(tabs)/stats` and `(tabs)/profile`) automatically.
3.  **Group Shared Screens**: Use parentheses folders (e.g. `(tabs)` or `(learn)`) to group screens without affecting route path strings, keeping API paths and routing links clean and predictable.
