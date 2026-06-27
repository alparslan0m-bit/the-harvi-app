# TypeScript Error Patterns — Extended Reference

Load this file when the main SKILL.md playbook doesn't cover your specific error pattern.

---

## Discriminated Unions

```typescript
// Build discriminated unions for exhaustive type narrowing
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'rect'; width: number; height: number };

function area(s: Shape): number {
  switch (s.kind) {
    case 'circle': return Math.PI * s.radius ** 2;
    case 'rect':   return s.width * s.height;
    default:
      // Exhaustiveness check — TS error if a case is missing
      const _never: never = s;
      throw new Error(`Unhandled shape: ${_never}`);
  }
}
```

---

## Type Predicates & Assertion Functions

```typescript
// Type predicate — narrows in if-block
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as User).id === 'string'
  );
}

// Assertion function (TS 3.7+) — throws if false, narrows after call
function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) throw new TypeError('Expected User');
}

// Usage
assertUser(apiResponse);
console.log(apiResponse.id); // string — no further check needed
```

---

## Mapped Types & Conditional Types

```typescript
// Make all keys optional deep
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// Pick only keys whose value matches a type
type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

type StringKeys = KeysOfType<{ a: string; b: number; c: string }, string>;
// "a" | "c"

// Conditional type with infer
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type Resolved = UnwrapPromise<Promise<string>>; // string
```

---

## Enums vs Const Assertions

```typescript
// Prefer const assertions over enums for tree-shaking and plain JS interop
// ❌ Enum (generates JS runtime object, harder to tree-shake)
enum Direction { Up = 'UP', Down = 'DOWN' }

// ✅ Const object + derived type
const Direction = { Up: 'UP', Down: 'DOWN' } as const;
type Direction = typeof Direction[keyof typeof Direction]; // "UP" | "DOWN"

// ✅ Or a simple string union
type Direction = 'UP' | 'DOWN';
```

---

## Module Augmentation (extending third-party types)

```typescript
// Extend Express Request with custom properties
// src/types/express.d.ts
import 'express';
declare module 'express' {
  interface Request {
    user?: import('../models/User').User;
    requestId: string;
  }
}

// Extend Window with custom globals
// src/types/global.d.ts
interface Window {
  analytics: typeof import('./analytics').default;
}

declare global {
  const __APP_VERSION__: string; // injected by build tool
}
export {}; // make this file a module (required for global augmentation)
```

---

## Async / Promise Patterns

```typescript
// TS2794: Not all code paths return a value in async function
async function findUser(id: string): Promise<User | null> {
  const user = await db.users.findById(id);
  if (user) return user;
  return null; // explicit return required — don't rely on implicit undefined
}

// TS2345 with Promise.all — type each promise explicitly
const [users, orders]: [User[], Order[]] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
]);

// Avoid floating promises (use @typescript-eslint/no-floating-promises)
// ❌ Fire-and-forget without handling rejection
someAsyncFn();

// ✅ Explicitly discard (shows intent)
void someAsyncFn();
// ✅ Or await it
await someAsyncFn();
```

---

## Index Signatures & Records

```typescript
// TS7017 — Element implicitly has 'any' type because index expression is not of type 'number'
const obj = { a: 1, b: 2 };
const key = 'a';
obj[key]; // error unless obj has index signature

// ✅ Fix A — type the object with an index signature
const obj: Record<string, number> = { a: 1, b: 2 };

// ✅ Fix B — cast the key
const typedKey = key as keyof typeof obj;
obj[typedKey]; // number

// ✅ Fix C — use satisfies to validate shape while keeping literal types
const obj = { a: 1, b: 2 } satisfies Record<string, number>;
```

---

## Class Patterns

```typescript
// TS2564 — Property has no initialiser and is not definitely assigned
class UserService {
  // ❌ Error if strictPropertyInitialization is on
  private db: Database;

  // ✅ Option A — initialise in constructor
  constructor(db: Database) { this.db = db; }

  // ✅ Option B — definite assignment assertion (only if DI framework sets it)
  private db!: Database; // e.g. TypeORM, NestJS DI

  // ✅ Option C — optional
  private db?: Database;
}

// Abstract classes
abstract class Animal {
  abstract speak(): string; // subclasses must implement

  move(): void {
    console.log(`${this.speak()} and moves`);
  }
}
```

---

## Utility Types Cheat Sheet

```typescript
Partial<T>           // all keys optional
Required<T>          // all keys required
Readonly<T>          // all keys read-only
Record<K, V>         // object with keys K and values V
Pick<T, K>           // subset of T's keys
Omit<T, K>           // T without keys K
Exclude<T, U>        // union members not in U
Extract<T, U>        // union members that extend U
NonNullable<T>       // T without null and undefined
ReturnType<F>        // return type of function F
Parameters<F>        // tuple of F's parameter types
InstanceType<C>      // instance type of constructor C
Awaited<T>           // unwraps Promise<T> recursively (TS 4.5+)
```

---

## Strict Mode Flag-by-Flag

| Flag | What it catches | Quick fix pattern |
|------|-----------------|-------------------|
| `strictNullChecks` | `null`/`undefined` not assignable to non-nullable | Add `\| null`, use `??`, add guards |
| `noImplicitAny` | Unannotated params/vars inferred as `any` | Add explicit types |
| `strictFunctionTypes` | Contravariant param checking on function types | Align param types |
| `strictBindCallApply` | `bind`/`call`/`apply` argument types | Match function signature |
| `strictPropertyInitialization` | Class props not set in constructor | Init or use `!` |
| `noImplicitThis` | `this` typed as `any` in functions | Add `this` param or use arrow functions |
| `useUnknownInCatchVariables` | `catch (e)` — `e` is `unknown` not `any` | `if (e instanceof Error) e.message` |
| `noUncheckedIndexedAccess` | `arr[i]` is `T \| undefined` not `T` | Null-check after array/map access |

Enable flags one at a time on legacy codebases, fixing each wave before enabling the next.
