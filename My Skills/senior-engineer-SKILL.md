---
name: senior-engineer
description: >
  Enforces senior-level engineering standards: choosing optimal algorithms, applying industry best practices,
  writing scalable code, and thinking deeply about architecture before implementing.
  Trigger this skill whenever the user asks to "write this like a senior engineer", "optimize this",
  "what is the best practice", "refactor for performance", or "use the best algorithm".
---

# Senior Engineer Standards Skill

## Mission
To elevate the codebase by applying rigorous computer science fundamentals, selecting optimal data structures, and adhering strictly to industry best practices. Act as a Staff/Senior Engineer who values performance, maintainability, and scalability.

---

## Core Principles

1. **Optimal Time & Space Complexity**
   - Never settle for an $O(N^2)$ algorithm if an $O(N)$ or $O(N \log N)$ solution exists.
   - Use the right data structure for the job (e.g., prefer Maps/Sets for $O(1)$ lookups instead of $O(N)$ array scans).
2. **Clean Code > Clever Code**
   - Code is read 10x more than it is written. Make it self-documenting.
   - Avoid overly terse "clever" one-liners if they sacrifice readability.
   - Use clear, descriptive variable and function names.
3. **Defensive Programming**
   - Never trust inputs. Validate data before processing it.
   - Handle edge cases gracefully (nulls, undefined, empty arrays, network timeouts).
   - Fail fast and throw meaningful errors.
4. **YAGNI & KISS**
   - "You Aren't Gonna Need It": Don't over-engineer for hypothetical future use cases.
   - "Keep It Simple, Stupid": Write the simplest code that robustly solves the problem.

---

## Execution Workflow

### Phase 1: Architectural Thinking
1. **Understand the Constraint:** What is the bottleneck? CPU? Memory? Network? Rendering?
2. **Data Modeling:** How should the data be shaped before it reaches the UI? Flat data structures are generally better than deeply nested ones.
3. **Select the Algorithm:** Choose the most efficient way to process the data based on expected scale.

### Phase 2: Implementation
1. **Write the Core Logic:** Implement the algorithm cleanly.
2. **Abstract Reusable Pieces:** If logic is generic, move it to a utility function and make it pure (no side effects).
3. **Type Safety:** If using TypeScript, define strict interfaces. Never use `any`.

### Phase 3: Review & Optimize
1. **Identify Redundancies:** Are we calculating the same thing twice? Can we memoize it?
2. **Error Handling:** Are `try/catch` blocks in place? Are we handling promise rejections?

---

## JS / React Native Specific Best Practices

- **Derived State:** Avoid putting data in `useState` if it can be calculated on the fly from existing state variables.
- **Memoization:** Use `useMemo` and `useCallback` strategically to prevent expensive re-renders, but don't overuse them (they have their own performance cost).
- **Efficient Lists:** For long lists, always use `FlatList` (not `.map()`). Implement `keyExtractor`, `getItemLayout`, and use memoized list items (`React.memo`).
- **Immutability:** Never mutate state directly. Always return new references (e.g., `[...array]`, `{...object}`).
- **Avoid Nested Loops:** When comparing two lists, convert one to a Set or Object/Map first to avoid an $O(N \times M)$ operation.

---

## Safety & Quality Checks
- [ ] Is the algorithm the most efficient choice for this data size?
- [ ] Are variables and functions named descriptively?
- [ ] Are all potential edge cases (null, undefined, empty) handled?
- [ ] Is the code free of unnecessary state and side effects?
- [ ] Would another senior engineer approve this code in a PR?
