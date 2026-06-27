---
name: typescript-error-cleanup
description: >
  Use this skill whenever the codebase has TypeScript errors that need to be fixed,
  removed, or prevented. Triggers include: 'fix TypeScript errors', 'clean up TS errors',
  'tsc errors', 'type errors', 'TypeScript is complaining', 'make the build pass',
  'remove any types', 'strict mode errors', 'implicit any', 'type mismatch',
  'Property does not exist', 'is not assignable to type', 'Object is possibly null',
  'Cannot find module', or any request to make a TypeScript project compile cleanly.
  Also trigger when the user pastes tsc output, error logs with TS error codes (TS2xxx),
  or asks to enable strict mode. Do NOT suppress errors with ts-ignore or any casts
  unless the skill explicitly permits it as a last resort — always prefer correct types.
---

# TypeScript Error Cleanup

## Guiding Principles

1. **Fix the root cause, not the symptom.** `@ts-ignore`, `as any`, and `// eslint-disable`
   are last resorts documented below. Every cast or suppression must have a comment.
2. **Preserve runtime behaviour.** Type fixes must not change what the code does.
3. **Work incrementally.** Large codebases: fix files in dependency order (leaf modules
   first) so cascading errors collapse naturally.
4. **Tighten, don't loosen.** The goal is stricter types, not a weaker `tsconfig.json`.

---

## Step 0 — Understand the Scope

```bash
# Full error count and list (no build output noise)
npx tsc --noEmit 2>&1 | tee /tmp/ts-errors.txt
wc -l /tmp/ts-errors.txt

# Group errors by code to find systemic issues first
npx tsc --noEmit 2>&1 | grep -oP 'TS\d+' | sort | uniq -c | sort -rn

# Group errors by file to prioritise
npx tsc --noEmit 2>&1 | grep -oP '^[^(]+' | sort | uniq -c | sort -rn | head -30
```

Read `tsconfig.json` before touching any file — strict flags determine which errors exist.

```bash
cat tsconfig.json
# Pay attention to: strict, noImplicitAny, strictNullChecks, noUncheckedIndexedAccess,
# exactOptionalPropertyTypes, target, lib, paths, baseUrl, skipLibCheck
```

---

## Step 1 — Fix `tsconfig.json` Hygiene First

Issues here cause hundreds of downstream errors. Fix these before touching source files.

```jsonc
// tsconfig.json recommended baseline
{
  "compilerOptions": {
    "strict": true,               // enables all strict sub-flags
    "noUncheckedIndexedAccess": true,  // arr[0] is T | undefined
    "exactOptionalPropertyTypes": false, // enable only when ready
    "skipLibCheck": true,         // don't type-check node_modules .d.ts
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler", // or "node16" for ESM
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true        // safe for Babel/SWC/esbuild
  }
}
```

**Common tsconfig mistakes that cause mass errors:**

| Problem | Fix |
|---------|-----|
| Missing `"lib": ["dom"]` for browser code | Add `"lib": ["ES2022", "DOM", "DOM.Iterable"]` |
| `paths` set but `baseUrl` missing | Add `"baseUrl": "."` |
| `target` too old for modern syntax | Raise to `"ES2022"` or match runtime |
| Missing `@types/*` package | `npm i -D @types/node` etc. |
| `"moduleResolution": "node"` with ESM imports | Switch to `"node16"` or `"bundler"` |

---

## Step 2 — Install Missing Type Definitions

```bash
# Find untyped packages (TS7016 / "has no exported member")
npx tsc --noEmit 2>&1 | grep "Could not find a declaration file"

# Install @types for each
npm i -D @types/lodash @types/node @types/react @types/react-dom   # example

# For packages with no @types, create a shim
# src/types/untyped-package.d.ts
declare module 'some-untyped-package' {
  const value: any;
  export default value;
}
```

Re-run `tsc` after this step — it often clears 20–40% of errors.

---

## Step 3 — Error Code Playbook

Work through errors in this order: structural issues first, then narrowing, then null/undefined.

Read the detailed playbook for complex patterns: [references/error-patterns.md](references/error-patterns.md)

### TS2339 — Property does not exist on type

```typescript
// ❌ Error
const x = obj.unknownProp;

// ✅ Fix A — extend the interface/type
interface MyObj { knownProp: string; unknownProp: number }

// ✅ Fix B — use a Record/index signature when keys are dynamic
const map: Record<string, number> = {};
map['anything'] = 1;

// ✅ Fix C — type guard before access
if ('unknownProp' in obj) { /* obj.unknownProp is safe here */ }

// ✅ Fix D — optional chaining when property may not exist
const val = (obj as any as { unknownProp?: number }).unknownProp;
```

### TS2345 — Argument not assignable to parameter

```typescript
// ❌ Error: Argument of type 'string | undefined' is not assignable to 'string'
function greet(name: string) {}
const maybeName: string | undefined = getUser()?.name;
greet(maybeName); // error

// ✅ Fix A — null-check before call
if (maybeName) greet(maybeName);

// ✅ Fix B — provide fallback
greet(maybeName ?? 'Guest');

// ✅ Fix C — widen the parameter type when optional is intentional
function greet(name: string | undefined) {}
```

### TS2322 — Type not assignable (assignment / return)

```typescript
// ❌ Widening issue
const status: 'active' | 'inactive' = getStatus(); // returns string

// ✅ Fix A — narrow with type predicate
function isStatus(s: string): s is 'active' | 'inactive' {
  return s === 'active' || s === 'inactive';
}

// ✅ Fix B — const assertion at origin
const STATUS = 'active' as const; // type: "active"

// ✅ Fix C — satisfies operator (TS 4.9+)
const config = { mode: 'active' } satisfies { mode: 'active' | 'inactive' };
```

### TS2531 / TS18048 — Object is possibly null / undefined

```typescript
// ❌ Error
document.getElementById('root').innerHTML = ''; // possibly null

// ✅ Fix A — null assertion (only when YOU know it cannot be null)
document.getElementById('root')!.innerHTML = '';

// ✅ Fix B — explicit null check
const el = document.getElementById('root');
if (!el) throw new Error('Root element not found');
el.innerHTML = '';

// ✅ Fix C — optional chaining + nullish coalescing
const text = el?.textContent ?? '';
```

### TS7006 — Parameter implicitly has 'any' type

```typescript
// ❌ Error
const double = (x) => x * 2;

// ✅ Always annotate callback parameters
const double = (x: number) => x * 2;
array.map((item: Item) => item.id);
```

### TS7031 — Binding element implicitly has 'any' type (destructuring)

```typescript
// ❌ Error
const { data, error } = result; // result is any

// ✅ Type the source, not the destructuring
const result: ApiResponse = await fetch(...);
const { data, error } = result;
```

### TS2554 — Expected N arguments, got M

```typescript
// Usually a signature mismatch. Check:
// 1. Are optional params marked with '?'?
// 2. Is the function overloaded and is the wrong overload being called?
// 3. Did a recent refactor add/remove a parameter?

// ✅ Mark truly optional params
function log(message: string, level?: 'info' | 'warn' | 'error') {}
```

### TS2304 — Cannot find name

```typescript
// Causes:
// A: Missing import  → add import statement
// B: Missing @types  → npm i -D @types/xxx
// C: Global not in lib → add to tsconfig "lib" or declare globally:
declare const __DEV__: boolean;          // e.g. webpack DefinePlugin globals
declare const process: NodeJS.Process;   // if not using @types/node
```

### TS2307 — Cannot find module

```bash
# Check 1: file exists with correct casing
ls src/components/Button.tsx   # not button.tsx

# Check 2: path alias misconfigured
# tsconfig.json paths must match bundler config (vite.config / webpack)
{
  "paths": { "@/*": ["./src/*"] }
}

# Check 3: missing index file
# import from './components' expects components/index.ts to exist
```

### TS2769 — No overload matches this call

```typescript
// Common in React with event handlers and library types
// ❌ Error
<input onChange={(e) => setState(e.target.value)} />

// ✅ Explicit event type
<input onChange={(e: React.ChangeEvent<HTMLInputElement>) => setState(e.target.value)} />
```

### TS2590 — Union type too complex / Expression produces union too large

```typescript
// Caused by: deeply nested conditional types, very large discriminated unions
// ✅ Break up the type with intermediate aliases
type Step1 = A | B | C;
type Step2 = Step1 | D | E;

// ✅ Replace conditional types with overloads or mapped types where possible
```

---

## Step 4 — Null / Undefined Sweep (strictNullChecks)

When enabling `strictNullChecks` on an existing codebase:

```bash
# Count null-related errors
npx tsc --noEmit 2>&1 | grep -c 'possibly null\|possibly undefined\|is undefined'
```

**Systematic approach:**

```typescript
// Pattern 1: API return types — be explicit
async function getUser(id: string): Promise<User | null> { ... }

// Pattern 2: Array access (noUncheckedIndexedAccess)
const items: string[] = [];
const first = items[0];           // type: string | undefined
const firstSafe = items[0] ?? ''; // string

// Pattern 3: DOM queries — always null-check
const form = document.querySelector<HTMLFormElement>('#myForm');
if (!form) return;

// Pattern 4: Optional chaining chain — stop at first undefined
const city = user?.address?.city ?? 'Unknown';
```

---

## Step 5 — Generic & Inference Fixes

```typescript
// ❌ Lost type information
function identity(x: any) { return x; }

// ✅ Preserve type with generic
function identity<T>(x: T): T { return x; }

// ❌ React useState loses type on complex objects
const [data, setData] = useState(null);   // type: null forever

// ✅ Provide explicit generic
const [data, setData] = useState<User | null>(null);

// ❌ Promise chain loses type
fetch('/api').then(r => r.json()).then(data => data.user.name); // data: any

// ✅ Type the json() call
fetch('/api')
  .then(r => r.json() as Promise<ApiResponse>)
  .then(data => data.user.name);          // data: ApiResponse
```

---

## Step 6 — React-Specific Patterns

```typescript
// Component props — always define interface
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}
const Button: React.FC<ButtonProps> = ({ label, onClick, disabled = false }) => ...

// forwardRef — type both the element and props
const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => (
  <input ref={ref} {...props} />
));

// useRef — distinguish mutable vs read-only refs
const mutableRef = useRef<number>(0);         // ref.current is number (mutable)
const domRef = useRef<HTMLDivElement>(null);   // ref.current is HTMLDivElement | null

// Context — avoid implicit any
interface ThemeContextValue { theme: 'light' | 'dark'; toggle: () => void }
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx; // ThemeContextValue, never undefined
}

// Event handlers — always type the event
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { ... };
const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); };
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
```

---

## Step 7 — Controlled Use of Escape Hatches

Only after exhausting proper type fixes. **Every suppression requires a comment.**

```typescript
// 1. Type assertion — only when YOU know better than the compiler
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
//   ↑ safe: getElementById returns HTMLElement | null, we know it's HTMLCanvasElement

// 2. Non-null assertion — only when null is impossible at runtime
const value = map.get('key')!;
// ⚠️ Will throw at runtime if key is missing — ensure invariant holds

// 3. @ts-expect-error — preferred over @ts-ignore (fails if error disappears)
// @ts-expect-error — third-party type is wrong, upstream issue #1234
thirdPartyLib.undocumentedMethod();

// 4. @ts-ignore — only if @ts-expect-error itself causes an error (rare)
// @ts-ignore — legacy interop with untyped CJS module, tracked in TECH-999
require('legacy-module').doThing();

// ❌ NEVER use bare `any` without justification
const data: any = response; // NO

// ✅ Use unknown + narrowing instead of any for untrusted input
function processApiResponse(data: unknown) {
  if (typeof data !== 'object' || data === null) throw new Error('Invalid response');
  const obj = data as Record<string, unknown>;
  // narrow fields individually
}
```

---

## Step 8 — Incremental Strict Mode Adoption

When adding `"strict": true` to an existing codebase with many errors, use project references
to migrate file-by-file without breaking the build.

```jsonc
// tsconfig.strict.json — strict config for already-clean files
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "strict": true, "noEmit": true },
  "include": [
    "src/utils/**/*",     // migrated modules
    "src/hooks/**/*"
  ]
}
```

```bash
# Run strict check only on migrated files
npx tsc -p tsconfig.strict.json --noEmit

# Track progress
npx tsc --noEmit 2>&1 | wc -l
```

---

## Step 9 — Verify Clean Build

```bash
# Full type check — must exit 0
npx tsc --noEmit
echo "Exit code: $?"

# Check for remaining suppressions (should be minimal and justified)
grep -rn '@ts-ignore\|@ts-expect-error\|as any' src/ | grep -v '//' | wc -l
grep -rn 'as any' src/ --include='*.ts' --include='*.tsx'

# Confirm no new errors crept in via test types
npx tsc -p tsconfig.test.json --noEmit 2>/dev/null || true

# Run tests to confirm no runtime behaviour changed
npm test -- --passWithNoTests
```

---

## Error Code → Section Quick Reference

| Error Code | Category | Go To |
|------------|----------|-------|
| TS2304, TS2307 | Missing name / module | Step 1, 2 |
| TS2339 | Property does not exist | Step 3 |
| TS2322, TS2345 | Type mismatch | Step 3 |
| TS2531, TS18048 | Possibly null/undefined | Step 3, 4 |
| TS7006, TS7031 | Implicit any | Step 3 |
| TS2554 | Wrong argument count | Step 3 |
| TS2769 | No overload matches | Step 3 |
| TS2590 | Union too complex | Step 3 |
| TS2344, TS2366 | Generic constraint | Step 5 |
| TS7016 | No declaration file | Step 2 |
| TS1005, TS1128 | Syntax / parse error | Fix syntax; likely a JS file included by mistake |

For patterns not in this file, see: [references/error-patterns.md](references/error-patterns.md)

---

## Common Anti-Patterns to Reverse

```typescript
// ❌ Widening everything to any
const config: any = loadConfig();

// ❌ Casting instead of typing
const user = response as User; // without verifying shape

// ❌ Disabling the checker project-wide
// tsconfig.json: { "checkJs": false, "noImplicitAny": false }

// ❌ Putting types only on variables, not at function boundaries
let result; // implicit any
result = fetchData();

// ❌ Using Object or {} as a type
function log(value: Object) {} // doesn't exclude null/undefined

// ✅ All of the above, fixed:
const config: AppConfig = loadConfig();          // typed at origin
function log(value: Record<string, unknown>) {}  // explicit structure
function fetchData(): Promise<DataResponse> {}   // typed at boundary
```

---

## Dependencies

- **TypeScript**: `npm i -D typescript` (4.9+ for `satisfies`; 5.x recommended)
- **ts-node** (optional): `npm i -D ts-node` for running scripts directly
- **@typescript-eslint**: `npm i -D @typescript-eslint/eslint-plugin @typescript-eslint/parser`
  — catches type-aware lint issues `tsc` won't (e.g. `no-floating-promises`, `no-unsafe-*`)
- **Type packages**: Install as needed per Step 2
