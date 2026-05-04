---
name: crud-answer-correctness-debugger
description: >
  Diagnose and fix bugs in quiz/flashcard CRUD systems where incorrect answers appear
  as correct, or correct answers appear as wrong. Use this skill whenever the user reports
  that quiz answers are being graded incorrectly, answer indices are off by one, shuffled
  options break the correct-answer mapping, encrypted/encoded answer fields are
  mismatched after option reordering, or answer resolution from database values fails.
  Also triggers for: "wrong answer shows as correct", "answer index bug", "quiz grading
  broken", "options shuffled but answer wrong", "secure field mismatch", "decryption
  answer off", "correct answer not matching", or any bug report about quiz answer logic.
  Always use this skill before touching answer-related code — it contains a complete
  bug taxonomy and checklist specific to this system's architecture.
---

# CRUD Answer-Correctness Debugger

This skill diagnoses why incorrect answers appear as correct (or vice versa) in quiz CRUD systems. It targets the specific architecture pattern used in this codebase: Supabase → raw DB rows → option parsing → answer resolution → optional encryption/encoding → optional shuffling → client-side decryption → grading comparison.

---

## Architecture Overview (Know Before You Debug)

The answer pipeline has **5 sequential transformation stages**. A bug at any stage corrupts all downstream stages.

```
Stage 1: DB Row → resolveAnswerIndex()     [index resolution from raw DB value]
Stage 2: buildSecure()                      [encode {answer, explanation} as base64 JSON]
Stage 3: shuffleOptions()                   [shuffle options array, remap correct index]
Stage 4: saveQuestionsToCache() / transport [cache or send to client]
Stage 5: decryptAnswer() → comparison       [decode and compare selected vs correct]
```

**The #1 source of bugs**: Shuffle happens AFTER `buildSecure()` writes the pre-shuffle index into the secure field, then `shuffleOptions()` creates a new index — but if `buildSecure()` is called AGAIN after shuffling, it overwrites with the wrong (shuffled) index resolution.

---

## Bug Taxonomy — All Known Bug Classes

### BUG-01 · Off-By-One in `resolveAnswerIndex`

**Symptom**: Answer is always one option off (e.g., correct is B but C is marked correct).

**Root cause**: DB stores 1-based index (1, 2, 3, 4) but code treats it as 0-based (0, 1, 2, 3) or vice versa.

**Location**: `useQuiz.ts` → `resolveAnswerIndex()`

**Check**:
```ts
// BUGGY: treats 1-based as 0-based
if (rawAnswer >= 0 && rawAnswer < n) return rawAnswer; // returns 1 for "answer=1" but correct is index 0

// CORRECT: detect and convert 1-based
if (rawAnswer >= 1 && rawAnswer <= n) return rawAnswer - 1; // converts 1→0, 2→1, etc.
if (rawAnswer >= 0 && rawAnswer < n)  return rawAnswer;     // already 0-based fallback
```

**Fix**: Always check 1-based range FIRST (it has priority), then 0-based as fallback.

---

### BUG-02 · Shuffle Breaks Pre-Encoded Answer Index

**Symptom**: Answer is correct ~25% of the time (random chance), seemingly random failures.

**Root cause**: `buildSecure()` encodes `answer = resolveAnswerIndex(rawAnswer, options)` using the **original** options order. Then `shuffleOptions()` rearranges options and finds `newCorrect` by searching for the option that was originally correct. But if `buildSecure` is called after shuffle and re-resolves from `rawAnswer` (DB value) using the already-shuffled options array — the text-match branches may pick wrong.

**Location**: `useQuiz.ts` — order of operations in `fetchQuestions()`

**Check the pipeline order**:
```ts
// BUGGY ORDER — buildSecure uses shuffled options, text-match may fail
const shuffledOpts = shuffle(options);
const secure = buildSecure(row, shuffledOpts); // ← uses shuffled order for text matching!

// CORRECT ORDER
const secure = buildSecure(row, options);           // Step 1: encode with original order
const { answer } = decryptAnswer(secure);           // Step 2: get original correct index
const { options: newOpts, correctIndex } =
  shuffleOptions(options, answer);                  // Step 3: shuffle + remap
const newSecure = safeBtoa(JSON.stringify({
  answer: correctIndex, explanation: ...            // Step 4: re-encode with new index
}));
```

**Critical rule**: `buildSecure()` must ALWAYS use the **original, unshuffled** options array.

---

### BUG-03 · Text-Matching Answer Resolution Ambiguity

**Symptom**: Specific questions always wrong; others fine. Affects questions where option text is similar or one option is a substring of another.

**Root cause**: In `resolveAnswerIndex`, the "text matching" branches:
```ts
// Branch: answer string fully contained in option
const sub = options.findIndex(o =>
  o.trim().toLowerCase().includes(lower) && lower.length > 2
);
```
If `rawAnswer = "A"` (the letter), `lower = "a"`, and an option contains the letter "a", the wrong option matches. The `lower.length > 2` guard helps but doesn't fully prevent it.

**Location**: `useQuiz.ts` → `resolveAnswerIndex()` text-matching section

**Priority check**: Verify the matching priority is:
1. Numeric conversion (safest)
2. Single-letter A/B/C/D
3. Exact text match (case-insensitive)
4. Option contained in answer (risky — use `length > 5` not `> 2`)
5. Answer contained in option (riskiest — last resort)

---

### BUG-04 · Double-Encoding / Double-Decoding of `secure` Field

**Symptom**: `decryptAnswer()` returns `{ answer: 0, explanation: "" }` fallback for all questions, so answer index is always 0 (first option always "correct").

**Root cause**: The `secure` field goes through multiple encoding attempts in `buildSecure()`. If the DB already stores a valid base64 JSON string (plain format), but code tries XOR-decrypt it first (and fails), it falls through to re-encode the raw DB value — but `rawAnswer` may now be `null`/`undefined` from a different column name.

**Location**: `lib/crypto.ts` → `decryptAnswer()` and `useQuiz.ts` → `buildSecure()`

**Decode attempt order in `decryptAnswer`**:
1. XOR decrypt (original Harvi format)
2. Unicode-safe base64 plain JSON (`safeBtoa` format)  
3. Plain base64 JSON (ASCII-only)
4. Fallback: `{ answer: 0, explanation: "" }` ← **silent bug if all 3 fail**

**Check**: Add logging to see which decode path fires:
```ts
function decryptAnswer(encrypted: string) {
  // Try 1: XOR
  try { ... if (ok) { console.log('[decrypt] XOR path'); return result; } } catch {}
  // Try 2: safeBtoa
  try { ... if (ok) { console.log('[decrypt] safeBtoa path'); return result; } } catch {}
  // Try 3: plain btoa
  try { ... if (ok) { console.log('[decrypt] plain btoa path'); return result; } } catch {}
  console.warn('[decrypt] ALL FAILED — returning 0 fallback for:', encrypted.slice(0,20));
  return { answer: 0, explanation: "" };
}
```

---

### BUG-05 · FK Column Mismatch — Wrong Questions Loaded

**Symptom**: Questions from a different lecture appear, making "correct" answers wrong for the displayed question.

**Root cause**: `fetchQuestions()` tries multiple FK column names in order (`lecture_id`, `subject_id`, `topic_id`…). If the table has `lecture_id` but it's always `null`, and also has `subject_id` populated, it may load questions from a different group.

**Location**: `useQuiz.ts` → `fetchQuestions()` FK candidate loop

**Check**:
```ts
// The first FK column that returns data wins — even if it's the wrong one
for (const fkCol of LECTURE_FK_CANDIDATES) {
  const { data } = await supabase.from("questions").select("*").eq(fkCol, lectureId);
  if (data && data.length > 0) { /* uses this — might be wrong lectures! */ break; }
}
```

**Fix**: Log which FK column matched. Verify the returned question IDs belong to the correct lecture.

---

### BUG-06 · Options Column Contains Objects, Not Strings

**Symptom**: Option text renders correctly but answer index is wrong. Text-matching fails silently.

**Root cause**: `parseOptions()` calls `extractOptionText()` which handles `{ text: "...", value: 0 }` objects. If the option object has a numeric `value` field equal to the correct answer index, but `resolveAnswerIndex` is called with the text array (after extraction), text-matching won't find numeric DB answer values.

**Location**: `useQuiz.ts` → `parseOptions()` + `resolveAnswerIndex()`

**Check**: After `parseOptions()`, log the resulting strings. Confirm they match what `resolveAnswerIndex` would find when `rawAnswer` is the DB's answer value.

---

### BUG-07 · Cached Questions Have Pre-Shuffle Stale Secure Field

**Symptom**: Questions work correctly online but answers are wrong when loaded from offline cache.

**Root cause**: Questions are cached with `saveQuestionsToCache()` after shuffling. But if the cache was written before the shuffle+re-encode fix was applied, stale cache entries have the wrong index in `secure`.

**Location**: `lib/questionCache.ts` + `useQuiz.ts` cache write path

**Fix**:
```ts
// After fetching and processing questions correctly:
if (questions.length > 0) {
  saveQuestionsToCache(lectureId, questions); // must save POST-shuffle questions
}

// On cache read, validate:
const cached = await loadQuestionsFromCache(lectureId);
// Optionally add a cache version field to invalidate stale pre-fix caches
```

**Quick workaround**: Clear AsyncStorage cache key `harvi:qcache:{lectureId}` to force re-fetch.

---

### BUG-08 · `resolveAnswerIndex` Letter-to-Index for Arabic/RTL Option Text

**Symptom**: Only affects specific languages/scripts; answer letters like "أ، ب، ج" not recognized.

**Root cause**: The single-letter detection only checks `charCodeAt(0) - 65` (A=0, B=1 for ASCII). Arabic letter answers are not handled.

**Location**: `useQuiz.ts` → `resolveAnswerIndex()` single-letter branch

---

## Debugging Workflow

### Step 1 — Isolate the failing question
Find a question where the wrong answer is marked correct. Record:
- `question.id`
- `question.options[]` (the array the user sees)
- `question.secure` (the encoded string)
- What `decryptAnswer(secure).answer` returns
- Which option index the user selected when they got it "wrong" 

### Step 2 — Decode the secure field manually
```ts
import { decryptAnswer } from '@/lib/crypto';
const result = decryptAnswer(question.secure);
console.log('decoded answer index:', result.answer);
console.log('option at that index:', question.options[result.answer]);
```
If `result.answer` points to the wrong option → bug is in `buildSecure` or `shuffleOptions` (BUG-01, BUG-02, BUG-03).
If `result.answer === 0` always → bug is in `decryptAnswer` failing silently (BUG-04).

### Step 3 — Check the raw DB value
Query Supabase directly:
```sql
SELECT id, text, options, answer, secure, explanation
FROM questions
WHERE id = '<failing_question_id>';
```
Compare the raw `answer` column value to what `resolveAnswerIndex` would produce.

### Step 4 — Trace the pipeline
Add console.logs at each stage in `fetchQuestions()`:
```ts
const options = parseOptions(pick(row, OPTIONS_CANDIDATES));
console.log('[Q]', str(row.id), 'raw answer:', pick(row, ANSWER_CANDIDATES));
console.log('[Q] options:', options);
const secure = buildSecure(row, options);
const { answer } = decryptAnswer(secure);
console.log('[Q] resolved answer index:', answer, '→', options[answer]);
const { options: newOpts, correctIndex } = shuffleOptions(options, answer);
console.log('[Q] after shuffle correct index:', correctIndex, '→', newOpts[correctIndex]);
```

### Step 5 — Check cache vs. live
Test the same lecture twice: once fresh (clear cache), once from cache. If they differ → BUG-07.

---

## Fix Templates

### Fix for BUG-02 (most common) — Correct pipeline order in `fetchQuestions`:

```ts
const raw: Question[] = data.map((row, i) => {
  const options = parseOptions(pick(row, OPTIONS_CANDIDATES));
  const imageUrl = str(pick(row, IMAGE_URL_CANDIDATES) ?? '').trim();
  return {
    id: str(row.id ?? i),
    text: str(pick(row, TEXT_CANDIDATES) ?? ''),
    options,
    // buildSecure MUST use original options order
    secure: buildSecure(row, options),
    image_url: imageUrl || undefined,
  };
});

const shuffledQs = shuffle(raw);

return shuffledQs.map((q) => {
  try {
    const { answer, explanation } = decryptAnswer(q.secure); // original index
    const { options: newOpts, correctIndex: newCorrect } =
      shuffleOptions(q.options, answer);                      // remap to shuffled order
    return {
      ...q,
      options: newOpts,
      // CRITICAL: re-encode with the POST-shuffle index
      secure: safeBtoa(JSON.stringify({ answer: newCorrect, explanation })),
    };
  } catch {
    return q;
  }
});
```

This is already the correct pattern in the codebase. If it's broken, verify `decryptAnswer(q.secure)` is not returning the fallback `{ answer: 0 }`.

### Fix for BUG-01 — Safe `resolveAnswerIndex`:

```ts
function resolveAnswerIndex(rawAnswer: unknown, options: string[]): number {
  const n = options.length;
  if (typeof rawAnswer === 'number') {
    if (rawAnswer >= 1 && rawAnswer <= n) return rawAnswer - 1; // 1-based FIRST
    if (rawAnswer >= 0 && rawAnswer < n)  return rawAnswer;     // 0-based fallback
    return 0;
  }
  if (typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== '') return resolveAnswerIndex(num, options);
    if (trimmed.length === 1) {
      const idx = trimmed.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < n) return idx;
    }
    const lower = trimmed.toLowerCase();
    const exact = options.findIndex(o => o.trim().toLowerCase() === lower);
    if (exact !== -1) return exact;
    // Only use substring matching as last resort with longer minimum length
    const contained = options.findIndex(o =>
      lower.includes(o.trim().toLowerCase()) && o.trim().length > 5
    );
    if (contained !== -1) return contained;
    const sub = options.findIndex(o =>
      o.trim().toLowerCase().includes(lower) && lower.length > 5
    );
    if (sub !== -1) return sub;
  }
  return 0;
}
```

---

## Quick Reference: Most Likely Bugs by Symptom

| Symptom | Most Likely Bug | File |
|---|---|---|
| Always one option off | BUG-01 off-by-one | `useQuiz.ts` |
| Random ~25% correct rate | BUG-02 shuffle order | `useQuiz.ts` |
| Specific questions always wrong | BUG-03 text-match | `useQuiz.ts` |
| First option always "correct" | BUG-04 decode failure | `crypto.ts` |
| Wrong questions appear | BUG-05 FK mismatch | `useQuiz.ts` |
| Offline only broken | BUG-07 stale cache | `questionCache.ts` |
| Correct online, wrong cached | BUG-07 stale cache | `questionCache.ts` |

---

## Files to Inspect

- `artifacts/mobile/hooks/useQuiz.ts` — Primary: `fetchQuestions`, `buildSecure`, `resolveAnswerIndex`, `shuffleOptions`
- `artifacts/mobile/lib/crypto.ts` — `decryptAnswer`, `safeBtoa`, `safeAtob`
- `artifacts/mobile/lib/questionCache.ts` — `saveQuestionsToCache`, `loadQuestionsFromCache`
- `artifacts/mobile/app/quiz/[lectureId].tsx` — `handleSelect`: compares `selectedIndex === answer`
- Supabase `questions` table — raw `answer`, `options`, `secure` column values
