# Empty States: Friendly Fallbacks & Call to Action

This document establishes the UI standards for empty state interfaces, zero-data dashboards, and call-to-action indicators in the Harvi application.

---

## 1. The Purpose of Empty States

An empty screen (e.g. no quiz history logs, no module purchases, or zero progress records) can feel broken if not designed properly. Harvi utilizes **Educational Empty States** that consist of:
1.  **Illustrative Vector Icon**: A feather icon themed using primary colors inside circular muted containers.
2.  **Clear Heading**: approachable bold fonts that summarize the state.
3.  **Educational description**: friendly text explaining *why* the page is blank and *how* to change it.
4.  **Actionable Button (CTA)**: A button that directs the user to take action.

```
       ┌────────────────────────┐
       │         ( 🛈 )          │
       │    No History Found    │
       │  Take a quiz to see    │
       │  your metrics here.    │
       │     [ Start Quiz ]     │
       └────────────────────────┘
```

---

## 2. Standard Reusable Empty State Component

```typescript
// components/ui/EmptyState.tsx
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>
        {description}
      </Text>
      {actionText && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.button, { backgroundColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Nunito_700Bold",
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
});
```

---

## 3. Deployment Contexts inside Harvi

*   **Learning Dashboard**: Shown when a user has no active subjects assigned or unlocked.
*   **Stats Center**: Shown when a user mounts the statistics screen before taking any quiz.
*   **Bookmarks Screen**: Shown when a user views their bookmark lists but has not flagged any questions.
