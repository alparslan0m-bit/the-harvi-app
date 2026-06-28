---
name: bug-hunting
description: >
  A systematic, rigorous approach to reproducing, isolating, and fixing bugs without guessing.
  Trigger this skill whenever the user says "find the bug", "fix this error", "why isn't this working",
  "debug this issue", or when a stack trace is provided.
---

# Bug Hunting Skill

## Mission
To methodically trace bugs to their absolute root cause and fix them surgically, ensuring no collateral damage or unintended side effects. **Never guess. Always prove.**

---

## Core Principles

1. **Reproduce First, Fix Later**
   - Never start changing code until you fully understand how to trigger the bug.
   - If the reproduction steps aren't clear, ask the user for them.
2. **Read the Error Carefully**
   - 90% of the time, the stack trace or error message tells you exactly what went wrong. Read it from top to bottom.
3. **Isolate the Variable**
   - Use a binary search approach. Comment out halves of the code or components until the bug disappears to find the exact line causing it.
4. **Fix the Root Cause, Not the Symptom**
   - Don't just patch the error (e.g., adding `?.` just to stop a crash). Understand *why* the data was null in the first place.
5. **One Change at a Time**
   - Never change multiple files or unrelated logic while hunting a bug. You will lose track of what actually fixed it.

---

## Execution Workflow

### Phase 1: Information Gathering
1. **Analyze the Error:** What is the exact error message? Where did it originate?
2. **Context:** What was the user doing when it happened? What state was the app in?
3. **Recent Changes:** What code was touched recently? (Bugs usually hide in the newest code).

### Phase 2: Isolation & Verification
1. **Add Strategic Logging:** Place `console.log` (or debugger breakpoints) before the crash point to inspect the state and props.
2. **Trace the Data Flow:** Follow the data backward from the crash point to its origin (e.g., API response -> State -> Component Prop).
3. **Identify the Broken Link:** Find exactly where the expected behavior diverges from reality.

### Phase 3: The Fix
1. **Formulate a Hypothesis:** "The app crashes because `item.price` is undefined when the API returns an empty array."
2. **Implement the Minimal Fix:** Write the smallest amount of code necessary to solve the issue. Do NOT refactor the surrounding code during a bug fix.
3. **Verify the Fix:** Ensure the error is gone and the original feature works as intended.

---

## React Native / Expo Specific Tips
- **Metro Bundler Caches:** If a change isn't reflecting or a weird module error occurs, suggest clearing the cache (`npx expo start -c`).
- **Async Storage/State:** Bugs often occur because the UI renders before async data is loaded. Check for loading states.
- **Navigation Params:** Ensure params passed between screens are correctly typed and actually exist.
- **Z-Index & Styling:** If a button isn't clickable, check if another invisible view is positioned over it (`zIndex` or absolute positioning).

---

## Safety & Quality Checks
- [ ] Has the bug been completely resolved?
- [ ] Did the fix introduce any new warnings or errors?
- [ ] Is the fix surgical? (i.e., did you avoid unnecessary refactoring?)
- [ ] Are edge cases handled? (e.g., empty arrays, null values, network failures)
- [ ] Have all temporary debugging `console.log` statements been removed?
