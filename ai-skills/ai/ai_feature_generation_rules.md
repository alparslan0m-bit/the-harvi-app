# AI Feature Generation Rules: Structural Coding Guidelines

These rules instruct future AI agents on how to construct, design, and code new product features in a codebase built with this architecture.

---

## 1. Feature Generation Workflow

When instructed to add a new feature (e.g. adding a "User Bookmarks" page or a "Mock Exams" flow), the AI agent must follow a strict **dependencies-first workflow**:

```
[Start Feature]
       │
       ├──► 1. Define Database schema migrations (PostgreSQL tables, triggers, RPCs)
       │
       ├──► 2. Generate TypeScript interface contracts (types/index.ts)
       │
       ├──► 3. Implement business logic Custom Hook (hooks/useFeatureName.ts)
       │
       ├──► 4. Implement design-aligned UI Components (components/feature/...)
       │
       └──► 5. Register page routes in the routing system (app/feature/...)
```

---

## 2. Coding Rules for AI Agents

1.  **Strict State Containment**: Never write local state variables (`useState` or mutations) directly inside screen route files. All states must reside inside a dedicated custom hook.
2.  **No Direct Network Calls**: Never call raw `fetch` or direct Supabase clients inside component files. Access data layers exclusively through React Query wrapper hooks.
3.  **Strict Color Token Compliance**: Never use raw color hex strings (e.g. `"#0ea5e9"`) inside components or stylesheets. Always fetch active colors through `const colors = useColors()`.
4.  **No Placeholder Code**: When writing components, all functions must be fully implemented. Writing comment placeholders like `// TODO: Implement submission` is strictly unacceptable and will result in build rejection.

---

## 3. Reference Feature Code Blueprint

This demonstrates the expected standard for hook-screen-view structures when generating new features:

### Step 1: Interface Contract (`types/feature.ts`)
```typescript
export interface BookmarkEntry {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}
```

### Step 2: Custom Hook Controller (`hooks/useBookmarks.ts`)
```typescript
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useBookmarks(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: bookmarks, isLoading } = useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookmarks").select("*");
      if (error) throw error;
      return data as BookmarkEntry[];
    },
    enabled: !!userId,
  });

  const toggleBookmark = useCallback(async (questionId: string) => {
    // Implement database insert/delete operations...
    await queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
  }, [userId, queryClient]);

  return { bookmarks, isLoading, toggleBookmark };
}
```

### Step 3: UI Presenter Component (`components/bookmarks/BookmarkList.tsx`)
```tsx
import React from "react";
import { FlatList, Text, View } from "react-native";
import { BookmarkEntry } from "@/types/feature";

export function BookmarkList({ items }: { items: BookmarkEntry[] }) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
          <Text>Question ID: {item.question_id}</Text>
        </View>
      )}
    />
  );
}
```
---

## 4. AI Verification checklist

Before returning code, the AI agent must verify:
*   [ ] Does the component inherit all styles from `useColors()` tokens?
*   [ ] Is all state logic extracted into a custom hook?
*   [ ] Do all dynamic elements carry valid, unique keys?
*   [ ] Are native functions wrapped in `try/catch` scopes with safe fallbacks?
*   [ ] Has type safety been fully validated without `any` escapes?
