# Performance Optimization: Zero-Lag Mobile Architecture

This document defines performance standards, render tree optimizations, and memory tuning guidelines for the Harvi workspace.

---

## 1. Preventing Render Tree Drifts

In React Native, render lag causes visible visual micro-stuttering during user scroll actions or card presses. Harvi prevents performance drops by keeping layout trees flat and optimizing re-renders.

### Key Rules
*   **Decouple Stateful Custom Hooks**: Components must be thin, visual presentation blocks. Any state tracking (forms, counters, active selections) must reside inside isolated custom hooks. This localizes renders to the specific elements changing instead of rebuilding the entire page.
*   **Explicit List Key Selection**: When rendering list items (e.g. subject lists or cards), never use random indices as keys. Always use persistent database identifiers (UUIDs):
    ```tsx
    // CORRECT
    {items.map((item) => <LectureCard key={item.id} item={item} />)}
    
    // AVOID
    {items.map((item, index) => <LectureCard key={index} item={item} />)}
    ```

---

## 2. Optimizing TanStack Query Cycles

To prevent unnecessary server fetches (which consume mobile network data and processing threads), Harvi configures precise query timing parameters:

```typescript
export function useModuleAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["content_access", user?.id],
    queryFn: () => fetchContentAccess(user!.id),
    enabled: !!user,
    
    // ── PERFORMANCE TUNING PARAMETERS ──
    staleTime: 1000 * 60 * 5,     // 5 Minutes (Safe to serve cache without refetching)
    gcTime: 1000 * 60 * 60 * 24,  // 24 Hours (Persist cached queries in memory)
    retry: 0,                     // Disable loop retries on failure
  });
}
```

---

## 3. High-Performance Image Rendering

Standard React Native `<Image>` components lack advanced memory optimizations, leading to heap inflation on heavy lists. Harvi resolves this by using `expo-image`, which manages high-speed disk caching and transitions:

```tsx
import { Image } from "expo-image";

export function CustomHeaderLogo() {
  return (
    <Image
      style={styles.logo}
      source={require("@/assets/logo.png")}
      placeholder="blur"             // Smooth visual loading transitions
      contentFit="cover"             // Fast resize optimizations
      transition={200}               // 200ms fade-in transition
    />
  );
}
```

---

## 4. Key Performance Guidelines

1.  **Strict Component Memoization**: Wrap subcomponents or card items that render in large datasets using React's `memo` to bypass evaluations during unrelated global re-renders:
    ```typescript
    import React, { memo } from "react";
    
    export const StatCard = memo(function StatCard({ label, value }) {
      return (
        <View> ... </View>
      );
    });
    ```
2.  **Run Costly Work Outside the Main Thread**: Calculations like sorting large lists or decrypting payloads (XOR decoders) must execute inside `useMemo` scopes, ensuring they only run when input parameters change:
    ```typescript
    const sortedHierarchy = useMemo(() => {
      return list.sort((a, b) => a.order - b.order);
    }, [list]);
    ```
