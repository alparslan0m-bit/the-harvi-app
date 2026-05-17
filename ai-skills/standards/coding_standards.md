# Coding Standards: TypeScript & Compiler Settings

This document defines the TypeScript coding standards, type-safety parameters, and compiler rules of the Harvi application.

---

## 1. Strict TypeScript Compiler Settings

To ensure maximum safety and find bugs during compilation rather than in production, the workspace inherits strict compiler configurations inside `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,                         // Enforces strict null and type checks
    "noImplicitAny": true,                  // Catches any untyped declarations
    "strictNullChecks": true,               // Prevents "undefined is not a function" errors
    "noUnusedLocals": true,                 // Cleans up unused local variables
    "noUnusedParameters": true,             // Cleans up unused function parameters
    "forceConsistentCasingInFileNames": true // Avoids file mapping issues on different OS environments
  }
}
```

---

## 2. Strong Typing for API Payloads

All database RPC and edge function payloads must carry explicit, strong TypeScript interfaces. Avoid using the generic `any` keyword.

```typescript
export interface QuizResultPayload {
  user_id: string;
  lecture_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
}

// Enforces types inside database operations
async function submitResult(payload: QuizResultPayload): Promise<void> {
  const { error } = await supabase.from("quiz_results").insert(payload);
  if (error) throw new Error(error.message);
}
```

---

## 3. Strict Coding Conventions

1.  **Prefer functional components and hooks**: Do not write class-based components unless it is required for lifecycle handling (e.g. `ErrorBoundary` components).
2.  **Explicit Return Types**: Write explicit return types for all public API functions, custom hooks, and context providers to improve compiler speeds and IDE support.
3.  **Strict Null Safety**: Always use safe optional chaining (`?.`) and nullish coalescing (`??`) operators when handling user profiles or network payloads:
    ```typescript
    const displayName = user?.profile?.name ?? "Medical Student";
    ```
