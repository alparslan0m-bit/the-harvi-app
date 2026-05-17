# Feature Template: Scaffolding Blueprint for New Features

This template provides the exact folder structure, TypeScript models, custom hook wrappers, and component layouts required to build modular features in the App Factory workspace.

---

## 📂 Proposed Folder Structure

When generating a new feature (e.g., `bookmarks`), structure files identically:

```
c:\Users\METRO\harvi gamed\
├── types/
│   └── bookmarks.ts             # 1. Type Definitions & Contracts
├── hooks/
│   └── useBookmarks.ts          # 2. Stateful Custom Hook (Controller)
├── components/
│   └── bookmarks/
│       ├── index.ts             # 3. Component Barrel Export
│       ├── BookmarkList.tsx     # 4. Presenter Component
│       └── BookmarkItem.tsx     # 5. Modular list item card
└── app/
    └── (tabs)/
        └── bookmarks.tsx        # 6. Minimalistic Route Screen (View)
```

---

## 💻 Code Scaffolding

### 1. Types Contract (`types/bookmarks.ts`)
```typescript
export interface Bookmark {
  id: string;
  user_id: string;
  question_id: string;
  created_at: string;
}

export interface ToggleBookmarkPayload {
  user_id: string;
  question_id: string;
}
```

### 2. Custom Hook Controller (`hooks/useBookmarks.ts`)
```typescript
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Bookmark } from "@/types/bookmarks";

export function useBookmarks(userId: string | undefined) {
  const queryClient = useQueryClient();

  // A. Fetch Bookmarks Query
  const { data: bookmarks = [], isLoading } = useQuery<Bookmark[]>({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as Bookmark[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // B. Toggle Action Mutation
  const toggleMutation = useMutation({
    mutationFn: async (questionId: string) => {
      if (!userId) throw new Error("Unauthenticated user");

      const { data, error } = await supabase.rpc("toggle_bookmark_sp", {
        p_user_id: userId,
        p_question_id: questionId
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks", userId] });
    },
  });

  const toggleBookmark = useCallback((questionId: string) => {
    return toggleMutation.mutateAsync(questionId);
  }, [toggleMutation]);

  return {
    bookmarks,
    isLoading,
    toggleBookmark,
    isToggling: toggleMutation.isPending,
  };
}
```

### 3. Component Barrel Export (`components/bookmarks/index.ts`)
```typescript
export * from "./BookmarkItem";
export * from "./BookmarkList";
```

### 4. Modular Card Item (`components/bookmarks/BookmarkItem.tsx`)
```tsx
import React, { memo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Bookmark } from "@/types/bookmarks";

export interface BookmarkItemProps {
  item: Bookmark;
  onRemove: (questionId: string) => void;
}

export const BookmarkItem = memo(function BookmarkItem({ item, onRemove }: BookmarkItemProps) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.foreground }]}>Question Card</Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity onPress={() => onRemove(item.question_id)} style={styles.removeBtn}>
        <Feather name="trash-2" size={18} color={colors.destructive} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  textContainer: { gap: 4 },
  title: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  removeBtn: { padding: 8 },
});
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Strict File Separation**: UI components must never declare their own state mutations. All database interactions and synchronization routines must run inside `useBookmarks.ts`.
2.  **Explicit Prop Checks**: Do not use dynamic object spreads (`{...props}`) inside visual presenters. Declare the complete set of props inside the interface contract.
3.  **Barrel Exports Rule**: Always map new sub-components inside the subdirectory's `index.ts` barrel to prevent parent screens from importing long, nested file paths.

---

## 📈 Scalability Notes

*   **Caching & Pre-Warming**: Utilize React Query's `initialData` parameter inside the custom hook to warm up screen widgets using locally saved AsyncStorage elements instantly upon launch, achieving **zero flicker loading**.
*   **Sequential Mutations**: Ensure database writes run over transactional Stored Procedures (RPCs) on Supabase rather than direct Client insertions, protecting schema logic from API compromises.
