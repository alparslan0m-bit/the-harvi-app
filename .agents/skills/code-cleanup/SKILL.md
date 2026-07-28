---
name: code-cleanup
description: Use this skill whenever the user asks to clean up, audit, or tidy a codebase — including requests to remove dead code, unused code, redundant code, duplicate logic, deprecated functions, stale feature flags, commented-out blocks, unused imports/dependencies, legacy files, or "remnants" of old features. Trigger on phrases like "clean up the codebase," "remove dead code," "find unused code," "audit the repo," "delete deprecated stuff," "remove old/legacy code," or "tidy up the app," even if the user doesn't use the exact words "dead code." This is a whole-repo audit-and-remove workflow, not a single-file lint pass — always scan the full project, verify every candidate before deleting, and never remove code based on a name or comment alone.
---

# Code Cleanup: Dead, Redundant & Deprecated Code Removal

A disciplined, whole-repo workflow for finding and safely removing code that no longer
earns its place: unused functions/files, duplicate logic, dead feature flags, stale
comments, unused dependencies, and abandoned legacy paths.

**Prime directive: verified deletion, not guessed deletion.** Every removal must be
backed by evidence that the code is unreachable or unused — never by a name like
`_old`, `_legacy`, `_v2`, or a `// TODO: remove` comment alone. Comments and names lie;
references don't.

---

## 0. Before touching anything

1. **Confirm a clean working state.** Run `git status`. If there are uncommitted
   changes, ask the user whether to stash/commit first — cleanup diffs must not get
   tangled with unrelated work.
2. **Confirm there's a safety net.** Prefer working on a new branch
   (`git checkout -b chore/dead-code-cleanup`). If the user declines, proceed but warn
   that uncommitted deletions are harder to review/revert.
3. **Establish a baseline.** Find and run the project's build, lint, and test commands
   (check `package.json` scripts, `Makefile`, `pyproject.toml`, `README`, CI config)
   *before* any changes. If the baseline is already failing, tell the user — don't let
   cleanup get blamed for pre-existing breakage.
4. **Scope the audit.** Default to the whole repo unless the user names a directory or
   package. State the scope you're using before starting.

---

## 1. Build a map of the codebase

Before hunting for dead code, understand what's actually load-bearing:

- Identify entry points: `main`, `index`, CLI scripts, server bootstrap files, exported
  package APIs (`package.json` `main`/`exports`, `__init__.py` exports, etc.)
- Identify what's *publicly exported* (a library's public API) vs *internal* — public
  API surface needs far more caution than internal helpers.
- Identify config-driven or dynamically-loaded code: plugin folders, route files loaded
  by convention, string-based `require()`/`import()`, reflection (`getattr`,
  `importlib`), DI containers. These won't show up in static "unused" scans and are the
  #1 cause of false positives.
- Note any feature-flag system in use (LaunchDarkly, env vars, config files) — flagged
  code is not dead just because the flag defaults to off.

## 2. Categories to hunt for

Work through these systematically rather than ad hoc:

| Category | Examples |
|---|---|
| **Unreachable code** | code after `return`/`throw`/`break`, `if (false)` branches, conditions that can never be true |
| **Unused symbols** | functions, classes, variables, exports never referenced anywhere |
| **Dead files** | files never imported/required by anything reachable from an entry point |
| **Unused dependencies** | packages in `package.json`/`requirements.txt`/`Cargo.toml` not imported anywhere |
| **Duplicate/redundant logic** | two functions or modules doing the same thing (often from copy-paste or incomplete refactors) |
| **Stale feature flags** | `if (flag) { new } else { old }` where the flag has been fully rolled out (or killed) for a long time — confirm with the user, this is a product decision, not just a code one |
| **Commented-out code** | blocks of code disabled via comments, especially with no explanation or date |
| **Debug/scaffolding leftovers** | stray `console.log`/`print`/`debugger`, commented assertions, `TODO`s referencing removed features |
| **Superseded versions** | `functionV2` sitting next to unused `function`, old API clients next to new ones |
| **Orphaned tests/fixtures** | test files for code that no longer exists |

## 3. Tooling by language

Use real tools to generate evidence — don't eyeball a large repo by hand. Run whichever
apply; install missing ones with the project's package manager (ask first if it would
add a new dependency).

**JavaScript / TypeScript**
```bash
npx knip                      # unused files, exports, and dependencies (best general-purpose option)
npx ts-prune                  # unused exports (TS)
npx depcheck                  # unused / missing dependencies
npx eslint . --rule '{"no-unused-vars":"error","no-unreachable":"error"}'
```

**Python**
```bash
pip install vulture --break-system-packages && vulture .   # dead code finder
pip install unimport --break-system-packages && unimport --check .  # unused imports
pyflakes .
```

**Go**
```bash
go vet ./...
deadcode ./...        # golang.org/x/tools/cmd/deadcode
staticcheck ./...
```

**Rust**
```bash
cargo +nightly udeps   # unused dependencies
cargo clippy -- -W dead_code
```

**Generic / any language**
```bash
grep -rn "console.log\|debugger" --include="*.{js,ts,jsx,tsx}" .
grep -rn "TODO\|FIXME\|XXX\|HACK" .
git log --diff-filter=D --summary | grep delete   # files recently deleted elsewhere (context for duplicates)
```

If no tool exists for the language, fall back to manual cross-referencing: for each
candidate symbol/file, `grep -rn` its name across the whole repo (including configs,
templates, docs, and test fixtures) and treat zero hits as "candidate," not "confirmed."

## 4. Verify every candidate before removing it

For each thing a tool flags, before deleting, check:

1. **Is it referenced anywhere, including non-code files?** Search templates, configs,
   CI YAML, docs, SQL migrations, GraphQL schemas, and string literals (dynamic
   imports/`getattr`-style access won't show up as a normal reference).
2. **Is it part of a public API?** If it's exported from a published package or a
   module other teams/repos may depend on, treat it as risky even if unused
   internally — flag for the user rather than silently deleting.
3. **Is it behind a feature flag that's still active or being A/B tested?** Don't
   delete the "losing" branch of an active experiment.
4. **Is it a migration, seed script, or anything with historical/audit value?**
   Database migrations and changelogs are often "unused" by current code paths but
   must never be deleted — they're historical record, not dead code.
5. **Does removing it break the baseline build/lint/test from step 0?** This is the
   final, authoritative check — tools can have false negatives.

If any check fails or is ambiguous, move it to the "needs confirmation" list — do not
delete it.

## 5. Triage into three buckets

- **Bucket A — safe to remove automatically:** stray debug prints, truly orphaned
  commented-out blocks with no nearby explanation, files with zero references anywhere
  in the repo (verified per step 4) and no entry-point/dynamic-loading path to them.
- **Bucket B — needs user confirmation:** stale feature flags, superseded
  implementations, exported/public-API symbols, anything touching migrations or
  generated code, anything a tool flagged but you're <100% sure about.
- **Bucket C — keep, with a note:** things that look dead but turned out to be used
  dynamically, part of a public contract, or otherwise load-bearing. Mention these in
  the final report so the user understands why they were left alone — this builds
  trust and avoids the same ground being re-litigated next cleanup pass.

## 6. Execute

1. Remove Bucket A items first, in small logical groups (e.g., "all unused imports in
   `src/utils`"), not one giant diff — this makes review and `git revert` tractable.
2. After each group, re-run the baseline build/lint/test. Stop and investigate
   immediately if anything breaks; don't keep deleting on a broken baseline.
3. Present Bucket B to the user as a clear list — file/symbol, why it looks dead, and
   what evidence supports that — and only remove items the user confirms.
4. Commit in units that make sense to revert independently (e.g., separate commits for
   "remove unused deps," "remove dead files," "remove stale feature flag X").

## 7. Final report

Summarize for the user:
- What was removed (grouped by category), with file counts / line counts removed.
- What's in Bucket B awaiting their decision, with reasoning for each.
- What's in Bucket C and why it was kept.
- Confirmation that build/lint/tests pass after cleanup.
- Any dependencies that are now safe to uninstall (separate from code removal, since it
  touches lockfiles).

---

## Guardrails (never do these)

- Never delete based on a name pattern (`*_old`, `*_deprecated`, `*_v1`) without
  independently verifying zero references.
- Never delete migrations, seed data, or changelog/history files.
- Never delete the losing side of an active feature flag/experiment without explicit
  user confirmation.
- Never delete anything from a public API/export surface without flagging it — that's
  a breaking change decision, not a tidiness decision.
- Never do a single massive delete-everything commit — always group logically and
  re-test between groups.
- Never proceed past a broken baseline (build/lint/test failing before you started) by
  assuming your changes aren't the cause — note it and let the user decide how to
  proceed.
