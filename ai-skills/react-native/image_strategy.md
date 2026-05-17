# Image Strategy: High-Performance C++ Caching & CDN Optimization

This document outlines the image rendering, graphic memory allocations, and CDN pipeline optimizations of the App Factory mobile client.

---

## 1. High-Speed Graphics Pipelines with `expo-image`

React Native's native `<Image>` component does not implement persistent, cross-session disk caching for remote image URLs. To prevent users from waiting for image fetches each time they launch a screen, Harvi uses `expo-image`.

`expo-image` implements highly optimized C++ under-the-hood graphics pipelines, including multi-threaded background decoding, GPU texture rendering, and high-speed disk caching:

```tsx
import React from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

export function UserAvatar({ url }: { url: string }) {
  return (
    <Image
      style={styles.avatar}
      source={{ uri: url }}
      placeholder="blur"             // Smooth visual loading transitions
      contentFit="cover"             // Dynamic aspect ratio scaling
      transition={200}               // 200ms cross-fade transition
      cachePolicy="disk"             // Force image cache persistence to disk
      priority="high"                // Allocate decoding threads immediately
    />
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
});
```

---

## 2. Dynamic BlurHash Loading Placeholders

To avoid displaying empty gray boxes while images load, `expo-image` supports **BlurHash placeholders**. These render highly compressed, beautiful gradient snapshots of images:

```tsx
// Pre-calculated BlurHash generated at the API level during content ingestion
const BLUR_HASH = "L~N[9vkCWBof~qj[fQj[t7j[ayfQ";

export function OptimizedDiagram({ url }: { url: string }) {
  return (
    <Image
      source={{ uri: url }}
      placeholder={{ blurhash: BLUR_HASH }}
      style={styles.diagram}
      contentFit="contain"
    />
  );
}

const styles = StyleSheet.create({
  diagram: { width: "100%", height: 220, borderRadius: 16 },
});
```

---

## 3. Real-World Startup Scaling: CDN Dynamic Transformations

Loading a 4000x3000 raw camera image into a 100x100 avatar view will instantly crash the app due to mobile heap memory exhaustion. To prevent this, Harvi scales all images dynamically at the **CDN layer** using Supabase Storage transform parameters:

```typescript
// utils/cdn.ts
export function getOptimizedImageUrl(rawUrl: string, width: number, height: number): string {
  if (!rawUrl.includes("supabase.co")) return rawUrl;

  // Append Supabase transform parameters dynamically
  const urlObj = new URL(rawUrl);
  urlObj.searchParams.append("width", width.toString());
  urlObj.searchParams.append("height", height.toString());
  urlObj.searchParams.append("resize", "contain");
  urlObj.searchParams.append("quality", "85"); // Perfect balance of clarity & size
  urlObj.searchParams.append("format", "webp");  // AVIF/WebP optimization

  return urlObj.toString();
}
```

---

## 4. AI Image Format Selection Heuristics

Future AI planning agents must utilize this design token hierarchy when mapping visual assets:

```
                  ┌──────────────────────────────┐
                  │     Select Image Formats     │
                  └──────────────┬───────────────┘
                                 │
                  Is the asset a simple shape or icon?
                  ├── Yes ──► Enforce SVG format (using react-native-svg)
                  │
                  └── No  ──► Does the asset require transparency?
                              ├── Yes ──► Format as WebP with alpha channel
                              └── No  ──► Enforce AVIF (high quality, 50% lighter than JPG)
```

---

# Anti-Patterns

*   **Unbounded High-Resolution Image Rendering**: Loading a raw image from camera rolls or unoptimized remote servers directly inside a component list.
    *   *Consequence*: Triggers Android and iOS Out-Of-Memory (OOM) native exceptions, instantly crashing the app during scroll lists.
*   **Layout Recalculations (Dynamic image bounds)**: Rendering remote images without declaring static, absolute dimensions (`width` and `height`) inside styling elements.
    *   *Consequence*: Images collapse into 0x0 layouts on mount, then pop open aggressively when network requests complete, triggering jarring layout shifts (CLS).
*   **Bypassing Image caching (`cachePolicy="none"`)**: Re-downloading remote profile photos or lecture guides on every mount cycle.
    *   *Consequence*: Ballooning mobile cellular data usage for users, slow screen rendering speeds, and elevated host storage billing.
