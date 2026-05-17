# AI Refactoring Rules: Safe Modularization, Execution Loops & Cleanup

These rules instruct future AI agents on how to safely refactor, modularize, and clean up code inside the App Factory workspace without introducing regression bugs or breaking compilation.

---

## 1. Architectural Tradeoffs: Simplicity vs. Abstraction

Before refactoring any piece of code, the AI agent must weigh the **Abstraction Tradeoff**:

*   **Premature Abstraction (The Danger)**: Creating highly configurable, generic wrappers for components that are only utilized in a single view. This inflates code complexity, increases initial cognitive load, and slows down developers.
*   **The Blueprint**: Prioritize **Simplicity First**. Duplicate a minor visual layout block 2-3 times before abstracting it into a shared global utility. Keep code linear and readable.
*   **Refactoring Triggers**: Refactor only when:
    1.  A component file exceeds **350 lines of code** (spurs modularization).
    2.  A state management system is duplicated across **3 distinct views** (spurs hook extraction).
    3.  A component needs to render in both Mobile (Expo) and Web (Next.js) environments (spurs package extraction under `/packages`).

---

## 2. Autonomous Refactoring Execution Loop

When modularizing a view or hook, follow this systematic **Surgical execution loop**:

```
        ┌────────────────────────────────────────────────────────┐
        │            Step 1: Parse State Dependency              │
        │  Analyze active component scopes & hook return contracts│
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │            Step 2: Extract Hook Controller             │
        │  Move mutations & side-effects to @/hooks/use[Name].ts │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │           Step 3: Scaffold Subcomponents               │
        │  Extract presenters to @/components/[name]/            │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Step 4: Clean Orphan Elements              │
        │  Delete unused variables, dead imports, and parameters │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Step 5: Verify & Compile                   │
        │  Run compilation check to verify zero regression bugs  │
        └────────────────────────────────────────────────────────┘
```

---

## 3. Real-World Startup Scaling: Backward Compatibility Rules

When refactoring shared hooks or API utilities that are used across multiple screens:
*   **Preserve Method Signatures**: Never delete or rename existing parameters inside a public hook. If a new parameter is required, define it as **optional**:
    ```typescript
    // CORRECT: Maintains backward compatibility for existing screens
    export function useQuizSession(userId: string, options?: { autoSync?: boolean })
    ```
*   **Do Not Break Public APIs**: If a shared component must change drastically, build a new version (e.g. `NewCard.tsx`) and progressively transition references rather than performing breaking edits on the master component.

---

# Anti-Patterns

*   **Speculative Abstraction ("Clever" code blocks)**: Writing overly complex, nested helper functions or routing abstractions because "we might expand the app into new domains tomorrow."
    *   *Consequence*: Elevates codebase friction, increases developer onboarding times, and blocks AI agents from understanding component workflows.
*   **Unrelated Code Polish ("The Boy Scout Trap")**: Modifying spacing, comments, or variable names in files that are adjacent to, but completely unrelated to, the target refactoring task.
    *   *Consequence*: Creates massive, noisy Git diffs containing hundreds of lines of unrelated edits, making code review cycles long and error-prone. Touch *only* what you must.
*   **Leaving Orphaned Imports**: Leaving trailing import statements of deleted or moved components inside screen headers.
    *   *Consequence*: Saturates bundle packaging loops, slows down Metro hot reloads, and clutters editor symbol searches.
*   **Deleting Pre-Existing Documentation**: Wiping out architectural comment blocks or developer explanation logs while refactoring logic blocks.
    *   *Consequence*: Destroys the localized context "brain" of the workspace, leading to subsequent developers repeating past architecture mistakes.
