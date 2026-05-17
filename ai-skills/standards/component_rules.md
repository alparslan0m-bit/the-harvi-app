# Component Rules: Presentation & StyleSheet Declarations

This document defines the rules for React Native component design, layout separation, and StyleSheet declarations inside the Harvi workspace.

---

## 1. Container-Presenter Architecture

All major visual features inside Harvi separate visual layouts (presenters) from state controllers (containers).

```
        ┌────────────────────────────────────────────────────────┐
        │                 Container (Custom Hook)                │
        │  Manages mutations, timers, active indexes, and sound   │
        └──────────────────────────┬─────────────────────────────┘
                                   │  Returns active states
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                  Presenter (Component)                 │
        │  Pure visual JSX rendering option buttons and loaders  │
        └────────────────────────────────────────────────────────┘
```

### Rationale
*   **Isolated Mock Testing**: Presentation components can be rendered and tested in isolated storybooks or mockup sandboxes simply by supplying mock properties, without spinning up heavy mock servers or database contexts.
*   **High Reuse**: The same quiz presenter component can render study questions, quick mock exams, or bookmark review sessions simply by changing the underlying state hook.

---

## 2. Strict StyleSheet Declarations

React Native compiles components faster when layouts are structured inside static sheets rather than inline styling arrays.

### StyleSheet Coding Rules
1.  **Always declare stylesheets at the bottom of the file**: This keeps the primary visual component logic at the top, allowing engineers to parse the component structure without scrolling past huge styling declarations.
2.  **Use React Native's static `StyleSheet.create`**:
    ```typescript
    import { StyleSheet } from "react-native";

    // Style declaration at the bottom of the component file
    const styles = StyleSheet.create({
      container: {
        flex: 1,
        padding: 16,
        alignItems: "center",
      },
      title: {
        fontSize: 20,
        fontWeight: "700",
      },
    });
    ```

---

## 3. Handling Dynamic Styles (Themes & States)

When styling rules depend on runtime parameters (like selected states or color palettes), keep the base layout inside static stylesheets and map dynamic overrides inline:

```tsx
export function SelectedCard({ isSelected }: { isSelected: boolean }) {
  const colors = useColors();

  return (
    <View 
      style={[
        styles.card, // Static layout parameters parsed on boot
        {
          // Dynamic variables resolved at runtime
          backgroundColor: isSelected ? colors.primary + "1A" : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        }
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>Selected Option</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
  },
  text: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  }
});
```
---

## 4. Component Designing Conventions

1.  **Strict Props Destructuring**: Always destructure component properties directly inside the function signature to get clean IDE hints and avoid redundant `props.` references.
2.  **No Direct Nested Styles Arrays**: Never write deep nested arrays of style overrides that resolve dynamically inside component layouts, as this impacts rendering performance. Keep override paths short and clear: `style={[styles.base, { override }]}`.
