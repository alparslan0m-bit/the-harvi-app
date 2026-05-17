# Naming Conventions: Filesystem, Component & Variables

This document defines naming standards for files, custom hooks, variables, directories, and database entities inside the Harvi workspace.

---

## 1. Filesystem Naming Standards

1.  **React Components**: Always use **PascalCase** for files containing UI elements:
    ```
    components/ui/OptionButton.tsx
    components/quiz/ResultsView.tsx
    ```
2.  **Stateful Custom Hooks**: Always use **camelCase** prefixed with `use` for state controllers:
    ```
    hooks/useColors.ts
    hooks/useQuizSession.ts
    ```
3.  **Pure Utility & Core Libraries**: Always use **camelCase** for pure logic libraries:
    ```
    lib/offlineQueue.ts
    lib/supabase.ts
    utils/formatters.ts
    ```
4.  **Routing Files**: Always use **lowercase** or **kebab-case** matching Expo Router specifications:
    ```
    app/quiz/[lectureId].tsx
    app/purchase/[moduleId].tsx
    app/+not-found.tsx
    ```

---

## 2. Variables & Constants Naming Standards

1.  **General Variables & State Methods**: Always use **camelCase** for local states and values:
    ```typescript
    const [loading, setLoading] = useState(false);
    const userEmail = "student@university.edu";
    ```
2.  **Centralized Configurations**: Always use **UPPERCASE** with snake_case for static, read-only parameters:
    ```typescript
    export const SECURE_XOR_KEY = "harvi-quiz-secure-key-2024";
    const CHUNK_SIZE = 1800;
    ```
3.  **Database Columns**: Always use **snake_case** matching PostgreSQL conventions:
    ```typescript
    const { data } = await supabase.from("quiz_results").select("user_id, correct_answers");
    ```

---

## 3. Naming System Guidelines

1.  **Consistent Custom Context Files**: Custom context files must pair matching `Provider` and hook names:
    *   Context file: `ThemeContext.tsx`
    *   Provider component: `ThemeProvider`
    *   Use hook: `useTheme`
2.  **Consistent Dynamic Paths**: Dynamic route parameters must carry specific descriptive suffixes (e.g. `[lectureId].tsx` instead of `[id].tsx`) to prevent route conflicts across page directories.
