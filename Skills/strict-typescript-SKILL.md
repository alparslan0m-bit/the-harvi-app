---
name: strict-typescript
description: >
  Enforces bulletproof, senior-level TypeScript standards. Guarantees 100% type safety, 
  eliminates 'any', handles nullability strictly, and prevents runtime crashes.
  Trigger this skill whenever the user says "write safe typescript", "fix these types", 
  "enforce strict types", or "make it type safe".
---

# Strict TypeScript Skill

## Mission
To write TypeScript code that is fundamentally impossible to crash due to type errors at runtime. "If it compiles, it works." We enforce strict, senior-level boundaries, eliminating guesswork and guaranteeing memory/type safety across the entire application.

---

## Core Principles

1. **The Absolute Ban on `any`**
   - Never, under any circumstances, use `any`. 
   - If the shape of the data is truly unknown at compile time, use `unknown` and write a type guard to narrow it down before usage.
2. **Strict Null Checks**
   - Always assume data from an external source or optional prop can be `null` or `undefined`.
   - Never blindly use the non-null assertion operator (`!`). Always write explicit fallback logic (e.g., optional chaining `?.`, nullish coalescing `??`, or early `return`).
3. **Immutability by Default**
   - Use `readonly` for array properties and object fields to prevent accidental mutations and side effects.
4. **No Lying to the Compiler**
   - Avoid type casting with `as` (e.g., `data as User`). This disables the compiler's protection.
   - If you must cast, it usually means your types or validation logic are flawed.

---

## Execution Workflow

### Phase 1: Domain Modeling
1. **Define Precise Interfaces:** Before writing logic, define the exact shape of your state, props, and API responses using `type` or `interface`.
2. **Discriminated Unions:** For complex states (like an API request), use discriminated unions to make impossible states unrepresentable.
   ```ts
   // Example of a safe discriminated union
   type FetchState<T> = 
     | { status: 'idle' }
     | { status: 'loading' }
     | { status: 'success'; data: T }
     | { status: 'error'; error: Error };
   ```

### Phase 2: Implementation
1. **Explicit Return Types:** Always define the return type of your functions (e.g., `function calculateTotal(): number`). This prevents accidental type leaks and makes the code self-documenting.
2. **Utility Types:** Don't repeat yourself. Use built-in utilities like `Pick`, `Omit`, `Partial`, and `Record` to derive types from your core domain models.
3. **Generic Constraints:** When writing generic functions, constrain the generic to ensure safety (e.g., `<T extends BaseEntity>`).

### Phase 3: Boundary Validation
1. **Never Trust the API:** TypeScript only exists at compile time. At runtime, an API might send back a string instead of a number.
2. **Type Guards:** Write custom type guards (`function isUser(obj: unknown): obj is User { ... }`) to validate data coming from APIs, local storage, or untyped third-party libraries.
3. **Zod Integration:** If the project uses a validation library like Zod, use it to parse and infer types simultaneously at the boundary.

---

## Senior-Level Tactics

- **`satisfies` over `as`:** Use the `satisfies` operator to validate that an object matches a specific type without losing the exact literal types of its properties.
- **Never ignore errors silently:** Ban `@ts-ignore`. If a type error must be temporarily suppressed due to a library bug, use `@ts-expect-error` and include a detailed comment explaining *why* it is safe.
- **Strict Configuration:** Ensure `tsconfig.json` has `"strict": true`, `"noImplicitAny": true`, and `"strictNullChecks": true` enabled.

---

## Safety & Quality Checks
- [ ] Is there a single `any` in the generated code? (If yes, rewrite it).
- [ ] Are all optional properties and potential `null`/`undefined` values safely handled?
- [ ] Have you avoided the use of the `as` keyword and the `!` non-null assertion?
- [ ] Are the function return types explicitly defined?
- [ ] Is the data crossing the network/storage boundary validated at runtime?
