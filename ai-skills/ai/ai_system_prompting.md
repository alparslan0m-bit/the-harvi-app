# AI System Prompting: Context Engineering & Self-Correction Workflows

This document defines the prompt engineering standards, system context injection formats, and autonomous code review rules of the App Factory AI system.

---

## 1. System Prompt Anchoring & Boundaries

When prompting future autonomous AI agents to write features, we must establish **system boundaries**. An unconstrained AI will write speculative code, introduce redundant dependencies, or leave unfinished placeholder tasks.

### Core Prompts Enforcements
1.  **Strict Context Anchoring**: AI prompts must include reference schemas, TypeScript interfaces, and exact relative folder imports prior to code requests:
    ```
    You are working inside a React Native Expo monorepo. 
    Core paths:
    - Custom hooks reside in: @/hooks/
    - UI Elements reside in: @/components/ui/
    - Active Colors must be queried from: @/hooks/useColors
    ```
2.  **No Placeholders Rule**: Force the generation agent to output fully complete, copy-pasteable, compiled code:
    ```
    Output COMPLETE production-grade code. You are forbidden from leaving comments like '// TODO: Implement action' or leaving partial file outputs.
    ```

---

## 2. Dynamic Self-Correction (Self-Review Loop)

To prevent agents from returning syntactically invalid code, the AI system implements an **Autonomous Self-Review Workflow**. The generating agent must run a pre-flight lint checks on its own output before marking a task complete:

```
        ┌────────────────────────────────────────────────────────┐
        │                 Step 1: Code Generation                │
        │  Generates component, hook, or schema integration      │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │                  Step 2: Self-Review                   │
        │  Agent checks output against self-review guidelines    │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                    Does the code pass all rules?
                    ├── No  ──► Step 3: Self-Correction Loop
                    │           (Fix lints, add missing files)
                    │
                    └── Yes ──► Step 4: Final Deliverable
```

### Self-Review Guidelines Checklist
*   **Imports Check**: Do all relative imports resolve cleanly? Are there any unused import statements left?
*   **Color Check**: Does the component fetch colors through `useColors()` or does it hardcode hex values?
*   **Typings Check**: Are all parameters explicitly typed? Are there any `any` escapes used?
*   **State Check**: Is all state logic correctly extracted into a hook, keeping the presentation file thin?

---

## 3. Few-Shot Code Scaffolding Blueprint

Injecting precise, highly typed few-shot examples inside system instructions reduces generation errors by over 80%:

```
Prompt: "Generate a toggle switch. Follow this reference syntax exactly:"
```
```tsx
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export interface ToggleSwitchProps {
  label: string;
  isEnabled: boolean;
  onToggle: (val: boolean) => void;
}

export function ToggleSwitch({ label, isEnabled, onToggle }: ToggleSwitchProps) {
  const colors = useColors();

  const handlePress = useCallback(() => {
    onToggle(!isEnabled);
  }, [isEnabled, onToggle]);

  return (
    <Pressable onPress={handlePress} style={styles.row}>
      <Text style={{ color: colors.foreground }}>{label}</Text>
      <View style={[styles.track, { backgroundColor: isEnabled ? colors.primary : colors.muted }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  track: { width: 44, height: 24, borderRadius: 12 },
});
```

---

# Anti-Patterns

*   **Shallow/Vague Prompting ("make me a button component")**: Providing open-ended requests without detailed architecture constraints, target folder setups, or design token references.
    *   *Consequence*: The AI will hallucinate styling classes, write custom styling variables, import wrong packages, and break compilation.
*   **Accepting Placeholder Code**: Approving AI code completions that contain trailing comments or non-functional lines.
    *   *Consequence*: Broken build chains, compile errors, and unresolved feature implementations during deployment.
*   **Ignoring Import Cleanliness**: Allowing generated scripts to leave dangling imports or unused variables.
    *   *Consequence*: Increased bundle sizes, slower packager build loops, and persistent ESLint compile warnings.
