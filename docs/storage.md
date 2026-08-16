# Local Storage in React Native: The Complete Architect's Playbook

**AsyncStorage vs. MMKV vs. SQLite vs. Drizzle ORM**

> **Audience:** Senior mobile / React Native engineers.
> **Scope:** Educational deep-dive covering the four candidate storage engines that
> power offline-first apps — how they work under the hood, real performance numbers,
> every trade-off, and a concrete decision framework — all grounded in Harvi's actual
> codebase (`artifacts/mobile`).
> **Version note:** Written against Expo SDK 54 / React Native 0.81 / React 19 /
> Expo Router 6, the stack currently used by the Harvi mobile app.

---

## Table of Contents

1. [TL;DR — The Ten-Second Verdict](#1-tldr--the-ten-second-verdict)
2. [Why This Document Exists](#2-why-this-document-exists)
3. [The Storage Spectrum: Key-Value vs. Relational](#3-the-storage-spectrum-key-value-vs-relational)
4. [How a Storage Call Actually Travels Through React Native](#4-how-a-storage-call-actually-travels-through-react-native)
5. [Deep Dive: AsyncStorage (Harvi's Current Engine)](#5-deep-dive-asyncstorage-harvis-current-engine)
   - 5.1 What It Is
   - 5.2 The History You Should Know
   - 5.3 How It Works Internally
   - 5.4 Performance Model
   - 5.5 Pros
   - 5.6 Cons
   - 5.7 Verdict
6. [Deep Dive: MMKV](#6-deep-dive-mmkv)
   - 6.1 What It Is
   - 6.2 How It Works Internally (mmap + protobuf)
   - 6.3 The Synchronous Superpower
   - 6.4 Encryption
   - 6.5 Instances, Listeners, Hooks
   - 6.6 Performance Model
   - 6.7 Pros
   - 6.8 Cons
   - 6.9 Verdict
7. [Deep Dive: SQLite (via expo-sqlite)](#7-deep-dive-sqlite-via-expo-sqlite)
   - 7.1 What It Is
   - 7.2 How It Works Internally
   - 7.3 Transactions and ACID
   - 7.4 WAL Mode
   - 7.5 Indexes, FTS, JSON1
   - 7.6 expo-sqlite API Landscape
   - 7.7 Performance Model
   - 7.8 Pros
   - 7.9 Cons
   - 7.10 Verdict
8. [Deep Dive: Drizzle ORM](#8-deep-dive-drizzle-orm)
   - 8.1 What It Is
   - 8.2 Why an ORM on Mobile
   - 8.3 Schema → Migrations → App
   - 8.4 Live Queries
   - 8.5 Drizzle Studio
   - 8.6 Performance Model
   - 8.7 Pros
   - 8.8 Cons
   - 8.9 Verdict
9. [Head-to-Head Comparison](#9-head-to-head-comparison)
   - 9.1 The Feature Matrix
   - 9.2 Benchmark Tables
   - 9.3 Memory Profiles
   - 9.4 Concurrency and Data Integrity
   - 9.5 Security and Encryption
   - 9.6 Backup and Restore Behavior
   - 9.7 Developer Tooling
   - 9.8 Ecosystem, Maintenance, and Future-Proofing
10. [Trade-Offs, Wins, and Losses — An Honest Scorecard](#10-trade-offs-wins-and-losses--an-honest-scorecard)
11. [Decision Framework](#11-decision-framework)
    - 11.1 Decision Trees
    - 11.2 When AsyncStorage Wins
    - 11.3 When MMKV Wins
    - 11.4 When SQLite Wins
    - 11.5 When Drizzle Wins
    - 11.6 The Hybrid Architecture (Recommended)
12. [Harvi-Specific Analysis](#12-harvi-specific-analysis)
    - 12.1 Current Storage Map
    - 12.2 Line-by-Line Review of Harvi's Patterns
    - 12.3 The Three Real Wins Available to Harvi
    - 12.4 Migration Roadmap (Phased)
    - 12.5 Code Examples for Each Phase
13. [Production Best Practices](#13-production-best-practices)
    - 13.1 The Anti-Patterns Hall of Shame
    - 13.2 Testing Strategies
    - 13.3 Observability
    - 13.4 Offline Sync Pitfalls
14. [Myths and FAQ](#14-myths-and-faq)
15. [Glossary](#15-glossary)
16. [References](#16-references)

---

## 1. TL;DR — The Ten-Second Verdict

You asked a direct question, so here is the direct answer first:

> **"Is SQLite + Drizzle + MMKV better than the AsyncStorage I built?"**

**Yes — but not for the reason you probably think, and not for everything.**

The honest, senior-architect answer has three parts:

1. **AsyncStorage is not "bad."** For the way Harvi uses it today (small JSON blob
   caches, per-user keys, a theme flag), it is a legitimate, zero-dependency,
   battle-tested tool. If your app never grows past ~a few MB of cached data and
   never needs to *query* that data, you can ship AsyncStorage forever and be fine.
   The AsyncStorage you "built" is a solid defensive architecture: memory-warmed
   caches, Zod-validated payloads, a promise-chain lock. That engineering is good.
   Do not throw it away out of FOMO.

2. **But you are paying a tax you don't need to pay.** Every AsyncStorage call
   crosses the old async native bridge, round-trips through native code, and
   forces you to `JSON.stringify` / `JSON.parse` entire blobs. MMKV removes that
   tax (synchronous JSI + typed getters, ~5–30x faster depending on workload).
   And your *offline queue* currently does the classic quadratic anti-pattern:
   read the whole array, mutate it, write the whole array back. SQLite turns that
   into an indexed table with transactional writes.

3. **The real answer is not "either/or" — it is "hybrid."** In 2026 the industry
   consensus for a production React Native app is:

   - **expo-secure-store** → auth tokens, secrets (you already have this — correct).
   - **MMKV** → flags, preferences, small hot caches that must read synchronously
     at cold start (theme, profile, per-user counters).
   - **SQLite + Drizzle** → anything you need to *query, filter, join, index, or
     transactionally mutate* (offline queue, question bank, progress ledger).
   - **AsyncStorage** → kept only for legacy keys you haven't migrated yet, or for
     the web target where MMKV/SQLite behave differently.

So: **yes, migrating the right subsets to MMKV and SQLite+Drizzle is a genuine win
for Harvi — but the win is surgical, not wholesale, and the biggest risk is
over-engineering a rewrite.** Everything below is the reasoning that leads to that
conclusion, plus the exact plan to execute it.

---

## 2. Why This Document Exists

Harvi is an offline-first quiz and learning app. That single adjective — *offline-first*
— forces every piece of user data to exist in two places at once:

- **Remote ground truth:** Supabase (Postgres in the cloud).
- **Local mirror:** whatever storage engine the device provides.

The entire quality of the offline experience is determined by the *local mirror*.
Not "whether" the app stores data — every app does — but:

- **How fast** the local read is when the user opens a screen offline (cold start
  latency is measured in frames, not seconds).
- **How much** data can be held locally before performance collapses.
- **How safe** the data is against crashes, corruption, and concurrent writes.
- **How queryable** the data is when you need a filtered, sorted, or aggregated view.

Harvi currently uses **AsyncStorage** for all of the above. This document is an
educational exercise in asking: *given what we now know about the four main storage
engines available to React Native, would we make the same choice?* It is written to
be a permanent reference — an engineering handbook you can hand to a new hire, or
re-read in six months before a storage refactor.

---

## 3. The Storage Spectrum: Key-Value vs. Relational

Before comparing libraries, you must understand that the four candidates are **not
four competitors in the same race**. They occupy two fundamentally different layers:

```
                          THE STORAGE SPECTRUM

   KEY-VALUE (blob storage)                 RELATIONAL (queryable storage)
   ─────────────────────────                ─────────────────────────────
   You give it a key.                       You give it a schema.
   It gives you a value (string/blob).      You ask structured questions (SQL).
   No relationships, no filtering,          Tables, rows, columns, indexes,
   no aggregation, no joins.                joins, transactions, aggregation.

   ┌──────────────────────────┐             ┌──────────────────────────────┐
   │   AsyncStorage           │             │                              │
   │   MMKV                   │             │   SQLite  (expo-sqlite)      │
   │   expo-secure-store      │             │      │                      │
   └──────────────────────────┘             │      ▼                      │
                                            │   Drizzle ORM (optional)    │
                                            └──────────────────────────────┘
```

The killer mistake most teams make is comparing **MMKV vs. SQLite** as if they were
substitutes. They are not. They answer different questions:

| Question you want to ask | KV engine | Relational engine |
|---|---|---|
| "What is the stored theme?" | ✅ Perfect | ⚠️ Overkill |
| "Is this lecture completed?" | ✅ Perfect | ⚠️ Overkill |
| "Give me all quiz results for user X, newest first, paged" | ❌ Read the whole blob, filter in JS | ✅ `SELECT ... WHERE user_id=? ORDER BY ts DESC LIMIT 20` |
| "How many lectures did I complete this week?" | ❌ Manual aggregation in JS | ✅ `COUNT(*) GROUP BY day` |
| "Atomically move a quiz result from 'pending' to 'synced'" | ⚠️ Read-modify-write of a whole array | ✅ `UPDATE ... WHERE id=?` in a transaction |

**The correct mental model:** KV engines are for *state*; relational engines are for
*data*. Harvi has both. Its theme, avatar, and flags are *state*. Its offline queue,
question bank, and progress ledger are *data* — and right now that data is being
shoved through a KV keyhole.

This distinction is the spine of the entire document. Keep it in your head as you
read.

---

## 4. How a Storage Call Actually Travels Through React Native

To understand the *performance* differences between the engines, you need to
understand the *plumbing* — because that's where the real latency lives. A single
`AsyncStorage.getItem()` does not just "read a file." It performs a full journey:

```
                     LEGACY BRIDGE vs. JSI (New Architecture)

   ┌─────────────────────  JS THREAD  ─────────────────────┐
   │                                                        │
   │  AsyncStorage.getItem("harvi:theme")                   │
   │        │                                               │
   │        ▼                                               │
   │   JSON-encode the call → serialize args                │
   │   enqueue message on the async bridge queue            │
   └────────│───────────────────────────────────────────────┘
            ▼
   ┌────────────────── THE BRIDGE (legacy path) ─────────────┐
   │  Message queued. Picked up asynchronously on the        │
   │  native side. Result later serialized BACK to JSON      │
   │  and dispatched back to JS as another message.          │
   │  → every round trip pays: serialization + queueing +    │
   │    a native task + promise resolution                   │
   └──────────────────────────────────────────────────────────┘

   ┌────────────────────── JSI (new path) ────────────────────┐
   │  MMKV: storage.getString("harvi:theme")                  │
   │   └─ direct C++ function-pointer call into the native    │
   │      library. No message queue. No JSON serialization.   │
   │      Return value handed straight back to JS.            │
   │      Cost: a function call + an mmap read.               │
   └──────────────────────────────────────────────────────────┘
```

Key facts every architect must internalize:

1. **The bridge is asynchronous by design.** Every legacy bridge call resolves on a
   later tick. That's why AsyncStorage's API is Promise-based — it's not a stylistic
   choice, it's an architectural consequence. You literally *cannot* read a value
   synchronously with it.

2. **JSI (JavaScript Interface) is synchronous and zero-copy.** The new
   architecture (default since RN 0.76) lets JS call into C++ natively. Libraries
   built on JSI (MMKV, expo-sqlite's sync API) can block the JS thread briefly to
   read a value — which, for a fast storage engine, is the *right* trade.

3. **Serialization is a hidden tax.** AsyncStorage stores strings. Every object you
   store becomes `JSON.stringify()` on write and `JSON.parse()` on read. For a 1 KB
   object this is noise; for a 1 MB question-bank blob it is a visible, measurable
   stall — and it happens on the JS thread (or native side) every single access.

4. **TurboModules/NitroModules are the modern evolution.** TurboModules optimize
   legacy calls; NitroModules (used by MMKV v4) are fully synchronous JSI with no
   interop layer. This is why 2026 MMKV benchmarks show "~30x faster" — it is not a
   miracle, it's the elimination of four layers of overhead.

**The architectural punchline:** AsyncStorage's slowness is *not* a bug in the
library. It is the honest cost of a design from 2015 that chose async safety over
speed. MMKV chose speed and pushes the durability concern onto the OS's mmap flush.
You are choosing a *philosophy*, not just a library.

---

## 5. Deep Dive: AsyncStorage (Harvi's Current Engine)

### 5.1 What It Is

`@react-native-async-storage/async-storage` is the community-maintained successor to
the AsyncStorage that lived inside React Native core. It is a **persistent, global,
asynchronous, key-value storage** system — the mobile analog of `localStorage`.
Both keys and values are strings. All methods return Promises.

Harvi's usage is a textbook (and well-architected) AsyncStorage deployment:

- `harvi:quiz_queue` → the offline mutation queue (`offlineQueue.ts`)
- `harvi:questionCache:<lectureId>` → cached quiz questions (`questionCache.ts`)
- `harvi:hierarchyCache` → the year→module→subject→lecture tree (`hierarchyService.ts`)
- `harvi:progress:<userId>` → completed-lecture IDs (`progressService.ts`)
- `harvi:bestScores:<userId>` → best quiz scores (`bestScoreService.ts`)
- `harvi:stats:<userId>` → aggregated stats (`statsService.ts`)
- `harvi:access:<userId>` → purchase access map (`accessService.ts`)
- `harvi:theme`, `harvi:avatar`, `harvi:displayName` → preferences
- `harvi:quiz:fkcol` → question foreign-key column resolution

That is ~9 distinct cache domains, many of them *per-user* namespaced. This is
exactly the shape of a serious offline-first cache layer.

### 5.2 The History You Should Know

AsyncStorage's implementation history explains every one of its quirks:

- **2015 (RN core):** naive `RCTAsyncLocalStorage`. On iOS it held everything in a
  single in-memory NSDictionary serialized to disk; on Android it used a SQLite
  table. Both were slow and buggy at scale.
- **Android's infamous 6 MB limit:** the original Android implementation imposed a
  6 MB database cap. Exceeding it produced `database or disk is full` errors and
  could *leave the DB malformed* (an `endTransaction()` throw that never rolled
  back). The cap is **configurable** today via
  `AsyncStorage_db_size_in_MB` in `android/gradle.properties`, and is "obsolete when
  the Next storage feature is enabled," but the 6 MB number still dominates folklore
  and every comparison blog. Treat it as "≈6 MB guaranteed, can be raised, still
  warns you not to."
- **2018 (community rewrite):** the package left RN core. Android kept a SQLite
  backend; iOS moved between a directory-of-small-files approach and a serialized
  dictionary depending on version. The **"Next storage" feature** (v3 beta, and an
  explicit SQLite-KMP multiplatform backend) is actively being developed — meaning
  the library itself is quietly migrating *its own internals* to SQLite.
- **2026:** v2.x (Harvi's `2.2.0`) remains the stable line — async bridge calls,
  string-only values, no encryption, no sync API.

**The meta-lesson:** the AsyncStorage maintainers are so convinced SQLite is the
right backing store that they are reimplementing AsyncStorage *on top of SQLite*.
That's a strong signal about where the industry is heading — the only question is
whether you should use AsyncStorage's private SQLite, or your own SQLite directly.

### 5.3 How It Works Internally

At the platform level (v2.x, current stable):

- **Android:** backed by a **SQLite** database (a `catalog` table with `key`/`value`
  columns, plus a `Next` mechanism in newer versions). All reads/writes run through
  a dedicated native executor thread — hence the "concurrent reads, serialized
  writes" behavior. Large values are stored in the DB itself; the 6 MB default cap
  applies.
- **iOS:** values are stored as individual files on disk (larger values) with a
  serialized dictionary for small values, historically. Behavior varies across
  versions; the project is converging on a single SQLite-KMP backend.
- **Both platforms:** every operation is marshaled through the async bridge, so
  each `getItem`/`setItem` pays message-serialization + queue + native dispatch +
  Promise overhead. `multiGet`/`multiSet`/`multiRemove` exist to amortize that
  overhead across several keys in one native round-trip — Harvi uses `multiGet` in
  `useProfileData.ts` and `multiRemove` in `cacheUtils.ts`. That's the right instinct.

### 5.4 Performance Model

| Aspect | Reality |
|---|---|
| API style | Fully async, Promise-based |
| Read latency (per key, typical device) | ~1–3 ms (independent of payload, but *plus* JSON.parse of the payload) |
| Write latency | ~1–3 ms + JSON.stringify |
| Throughput (sequential reads) | ~1–2k ops/sec; tight loops degrade |
| Bridge cost | Dominant: every op = serialized bridge round-trip |
| Serialization | You must stringify/parse everything yourself |
| Query capability | None. `getAllKeys()` + filter in JS is the only "query" |
| Concurrency | Promise-based; your own locking needed (Harvi's `withQueueLock`) |
| Typical max healthy size | Low-single-digit MB before slowness is felt; not an absolute wall |
| Encryption | None (pair with expo-secure-store or wrap it) |
| Cold-start hydration | `getItem` is async → you must hydrate after first render |

The `withQueueLock` in Harvi's `offlineQueue.ts` deserves a mention here. It is a
JS-side promise chain that serializes queue mutations to avoid lost updates. It is
**correct** — and it is also a *workaround*: the underlying engine offers no atomic
"append to array" operation, so you hand-roll one. SQLite gives you that atomically
with an `INSERT` inside a transaction. Never confuse "I built a lock" with "the
engine is safe."

### 5.5 Pros

- **Zero configuration.** Install, import, call. No native setup, no config plugin,
  no metro/babel changes. Works in **Expo Go** (MMKV and SQLCipher do not).
- **Works everywhere.** iOS, Android, and **web** via `react-native-web` with the
  same Promise API. Harvi's `react-native-web` dependency (`0.21.0`) makes web
  support a real consideration — AsyncStorage is the only one of the four that is
  fully first-class on web.
- **Mature and stable.** ~7 years of production use, hundreds of millions of
  installs, an active community. The failure modes are documented and known.
- **Asynchronous by design.** No risk of blocking the JS thread on a slow read —
  the cost is paid in latency instead.
- **Simple mental model.** String in, string out. Junior engineers can't corrupt a
  schema because there is no schema.
- **Already deeply integrated into Harvi.** Replacing it wholesale touches 9
  service files, two hooks, and a store. That's real inertia in its favor.

### 5.6 Cons

- **Slow for what it is.** A `getItem` of a 100 KB JSON blob is a bridge round-trip
  *plus* a JSON.parse on the JS thread. On a mid-range Android device during a
  screen transition, that's jank you can feel.
- **No synchronous reads.** You cannot read a value before first render. Harvi
  works around this with the "warm memory cache" pattern (`warmStatsCache`,
  `warmProgressCache`) — hydrate from AsyncStorage once per session, serve from
  memory after. That pattern is correct, but it is a *mitigation* of a platform
  limitation, and it means a cold start still renders empty until the first await.
- **String-only, schema-less.** Typo a key and you silently get `null`. Change the
  shape of a cached object and you must version-and-migrate it by hand or ship
  Zod-validated recovery (Harvi does the latter — good).
- **Read-modify-write is unsafe and quadratic.** The offline queue reads the *entire*
  array, appends one item, writes the *entire* array back. As the queue grows, every
  enqueue rewrites everything before it. That's O(n) per enqueue, O(n²) across a
  burst — and any interleaved read during the write window can observe a torn state
  without the lock.
- **No partial updates.** You cannot patch one field of a stored object; you must
  rewrite the whole serialized blob.
- **No transactions.** `multiSet` is not atomic in the relational sense. Crash
  mid-batch and you have a partially-updated cache.
- **6 MB folklore and real Android caution.** The cap is configurable, but the
  documented failure mode (malformed DB) is real enough that the docs themselves
  warn you.
- **No encryption.** Anything sensitive in AsyncStorage is plaintext on disk.
- **Not the future.** The maintainers are moving the backend to SQLite themselves;
  the async-bridge architecture is legacy relative to the JSI ecosystem.

### 5.7 Verdict

**AsyncStorage is the right tool for small, low-frequency, non-queryable, non-
sensitive state on a budget.** It is *not* the right tool for a growing offline
queue, a queryable question bank, or any hot path where cold-start latency matters.
For Harvi specifically: it is overused. Several of its uses are KV-native (theme,
avatar, flags — fine), but several are relational data forced through a KV keyhole
(the queue, the question cache, the progress ledger).

---

## 6. Deep Dive: MMKV

### 6.1 What It Is

MMKV is a key-value storage framework written in C++ by **Tencent** for **WeChat**
(which uses it across hundreds of millions of devices). `react-native-mmkv` (by Marc
Rousavy) is the JSI binding that exposes it to React Native. Version 4 is a
**NitroModule** — fully synchronous, JSI-backed, and the current "production
default" for React Native key-value storage in 2026.

The one-line sales pitch, which is largely true: **the same speed class as reading a
variable from memory, with persistence.** The project's own claim is "~30x faster
than AsyncStorage."

### 6.2 How It Works Internally (mmap + protobuf)

This is the part that makes MMKV genuinely different from AsyncStorage, and you
should be able to explain it in an interview:

1. **Memory-mapped files (`mmap`).** On both iOS and Android, MMKV maps a file on
   disk into the process's virtual address space. Reads become plain memory reads
   from the mapped region — no system call, no kernel copy, no file I/O on the hot
   path. The OS synchronizes dirty pages back to disk asynchronously via its page
   cache, and a background thread forces a `msync`/flush periodically.

2. **Protobuf-style encoding.** Values are encoded with a compact, binary,
   varint-heavy format (similar to Protocol Buffers) rather than JSON. This gives
   smaller footprints and — critically — **avoids the JSON.stringify/parse cost** on
   every access. Because reads are typed (`getString`, `getNumber`, `getBoolean`,
   `getMap`, `getArray`, `getUint8Array`), there is no decode-the-whole-blob step.

3. **CRC-based integrity.** MMKV embeds a cyclic-redundancy-check in its file
   header so corruption (e.g., from a power loss mid-flush) is detectable, not
   silently accepted.

4. **Write-through design.** `set()` writes into the mapped memory immediately and
   flags the page dirty; durability to physical disk is delegated to the OS with a
   best-effort flush. This is the explicit **speed-for-durability** trade: a value
   you just `set()` is visible to your app instantly, but may not be physically on
   disk for a moment.

### 6.3 The Synchronous Superpower

The single most important property of MMKV is not raw throughput — it's that
**reads are synchronous**:

```ts
// AsyncStorage (must await — UI must render a loading state first)
const theme = await AsyncStorage.getItem("harvi:theme");

// MMKV (value is available BEFORE the component mounts)
const theme = storage.getString("harvi:theme");
```

This eliminates an entire class of bugs and UX artifacts:

- **No cold-start flash of empty states.** Harvi's warmup functions exist because
  the first AsyncStorage read is async. With MMKV, hydration can happen *before*
  the first render or even synchronously inside a module init.
- **No "await-then-setState" dance** in stores. `themeStore` could read the theme
  synchronously at module load instead of firing a promise in a `useEffect`.
- **Zustand `persist` middleware** accepts a synchronous storage adapter directly —
  no Promise wrapper needed (redux-persist does need one).
- **Predictable timing.** You know the read happened. There's no race between
  "query resolved" and "storage resolved."

The cost: a synchronous read can block the JS thread. For a fast KV engine that is a
sub-millisecond event — an acceptable, usually invisible price. The rule is *"if
your value is small and hot, sync is a feature; if it's a 10 MB blob, sync is a
bug"* — and MMKV's docs explicitly advise keeping large values out.

### 6.4 Encryption

MMKV has **built-in encryption**: pass an `encryptionKey` when creating an instance
and every value is encrypted before it touches disk (AES family). You get:

- `encrypt(key)` / `recrypt(key)` — enable encryption on an existing instance, or
  rotate keys **in place**.
- Encryption is per-instance, so you can have an encrypted "sensitive" instance and
  a plain "cache" instance in one app.

The correct production pattern is to **generate the key once, store the key in the
OS keychain (expo-secure-store / react-native-keychain), and hand it to MMKV** —
never hardcode it. This is the "keychain-backed key" pattern and it's the standard
2026 answer to "MMKV vs. SecureStore": SecureStore holds the *key*, MMKV holds the
*bulk encrypted data*.

Caveats you must respect:

- Changing the `encryptionKey` on an existing instance **does not re-encrypt old
  data automatically** — you must read plaintext, write under the new key, and
  clear the old instance, or you'll silently fail to decrypt at next launch.
- For biometric-gated or compliance-critical secrets, keep using a dedicated secure
  store; MMKV encryption is *good*, not *Keychain*.
- Web: MMKV's web fallback exists but encryption is native-only.

### 6.5 Instances, Listeners, Hooks

- **Multiple instances:** you can create named instances (`new MMKV({ id: "user-42" })`),
  each with its own file. This is the idiomatic replacement for Harvi's
  string-prefix namespacing (`harvi:progress:<userId>`) — you get the namespace for
  free and can `clearAll()` a user's instance on logout instead of enumerating and
  deleting keys.
- **Change listeners:** `storage.addOnValueChangedListener((key) => …)` fires on any
  write, from anywhere — including other screens or native code. Perfect for
  invalidating caches or driving UI.
- **Hooks API:** `useMMKVString`, `useMMKVNumber`, `useMMKVBoolean`, `useMMKVObject`
  re-render components when the underlying value changes. This is reactive storage —
  it can replace a chunk of custom store wiring.
- **Helpers:** `getAllKeys()`, `contains(key)`, `delete(key)`, `clearAll()`,
  `getSize()`, and `getAllValues()`.

### 6.6 Performance Model

Independent measurements (2025–2026, `mrousavy/StorageBenchmark`, replicated by
several blogs) are more sober than the marketing "30x" but still decisive:

| Operation | AsyncStorage | MMKV | Notes |
|---|---|---|---|
| Single read (avg) | ~2.5 ms | ~0.5 ms | ~5x on a single call |
| Single write (avg) | ~2.9 ms | ~0.6 ms | ~5x |
| 1,000 sequential reads | ~2,500 ms | ~120 ms | ~20x — the *amortized* win |
| Cold-start hydration of many keys | noticeable | imperceptible | the user-visible win |
| Read latency (micro-architecture) | bridge + SQLite + parse | mmap memory read | 0.01 ms class per op |

Two honest caveats:

1. **The 30x number depends on workload.** MMKV's own benchmarks are dominated by
   the *synchronous loop* advantage; a single `getItem` here and there is ~5x, which
   is still meaningful but not life-changing.
2. **There is one contrarian benchmark** (mrousavy/mmkv-vs-async_storage) that found
   AsyncStorage *faster* for very large state trees (150k keys) because AsyncStorage
   can use native-side JSON optimizations and batching. It's a single, workload-specific
   result, but it's a useful reminder that **benchmarks are workload-shaped** — never
   migrate on a headline number alone; measure *your* payload sizes on *your* low-end
   device.

### 6.7 Pros

- **Synchronous reads/writes** — the single most architecturally valuable feature.
- **~5–30x faster** than AsyncStorage depending on workload.
- **Typed getters** (`getString`, `getNumber`, `getBoolean`, `getArray`, …) — no
  JSON round-trip on hot paths.
- **Built-in AES encryption** with in-place `recrypt()` key rotation.
- **Multiple instances** → clean per-user namespacing + one-call `clearAll()`.
- **Change listeners + React hooks** → reactive storage with less custom wiring.
- **Stores numbers/booleans natively** — no string coercion.
- **Small binary footprint** (~200 KB native), no server, no schema.
- **Battle-tested at WeChat scale** — the C++ core runs on hundreds of millions of
  devices.
- **Web fallback** exists (though encryption is native-only).

### 6.8 Cons

- **Not available in Expo Go.** It's a native module; you need a development build /
  EAS dev client / prebuild. Harvi already uses `expo-dev-client`, so this is a
  non-issue for production builds — but a real consideration if anyone relies on
  Expo Go for QA.
- **No querying, filtering, joins, or aggregation.** It is a KV store. Period. A
  "query" is `getAllKeys()` + JS filtering.
- **Sync API can block the JS thread.** Fine for small hot values; a footgun if you
  naively store a large blob.
- **Durability is best-effort.** The OS flush is asynchronous; on a sudden power
  loss the very latest writes *may* be lost (CRC catches corruption, not "last write
  didn't flush"). AsyncStorage's SQLite commit is arguably more crash-strict.
- **mmap footprint grows with file size** — the entire mapped file occupies virtual
  address space; huge single values are counter-indicated.
- **Ecosystem lock to one binding** (react-native-mmkv by mrousavy — healthy and
  popular, but a smaller bus factor than the RN core community).
- **iOS backup semantics:** MMKV files are excluded from iCloud backup by default —
  which is usually *desired* for cache data but can surprise you if you put
  must-restore data in it.

### 6.9 Verdict

**MMKV is the correct upgrade for Harvi's KV-shaped data: theme, profile, flags,
per-user warm caches, and any value that must be readable synchronously at cold
start.** It directly removes the reason Harvi's services had to build "warm memory
cache" layers and an async-hydration dance. It does *not* solve the offline queue,
the question cache, or any queryable/relational workload — that is SQLite's job.

---

## 7. Deep Dive: SQLite (via expo-sqlite)

### 7.1 What It Is

SQLite is the most widely deployed database engine on Earth — a **serverless,
embedded, relational, ACID-compliant** database that lives in a single file on
device. In React Native it is exposed through `expo-sqlite` (Expo SDK 54, Harvi's
version) or community bindings (`react-native-sqlite-storage`, `react-native-quick-sqlite`).
Every iOS and Android app already ships a copy of SQLite in the OS; the libraries
are just bindings to it.

Notably, both AsyncStorage (Android, and the new "Next"/SQLite-KMP work) and MMKV's
competitors keep coming back to SQLite as the *default honest database*. That is not
a coincidence.

### 7.2 How It Works Internally

- **B-tree pages in a single file.** Tables and indexes live in B-tree structures on
  pages inside one `.db` file (plus sidecar `-wal` and `-shm` files in WAL mode).
  Point lookups via an index are O(log n); full scans are O(n) but fast.
- **SQL engine.** You query declaratively: `SELECT`, `JOIN`, `WHERE`, `GROUP BY`,
  `ORDER BY`, `LIMIT` — the engine picks the plan. No manual blob juggling in JS.
- **Prepared statements.** Compile a query once, bind parameters repeatedly — the
  efficient way to do bulk inserts (expo-sqlite exposes `prepareSync`/`prepareAsync`).
- **Indexes.** A column index turns "find all quiz results for user X" from a scan
  into a B-tree walk. This is the feature KV stores simply do not have.
- **Extensions of note:** JSON1 (query JSON columns with `json_extract`), FTS5
  (full-text search — useful for future quiz-question search), and
  `PRAGMA` tuning (WAL, `synchronous`, cache size, `foreign_keys`).

### 7.3 Transactions and ACID

This is where SQLite *decisively* beats AsyncStorage/MMKV for Harvi's queue:

- **Atomicity:** all statements in a transaction commit together or not at all.
  Crash mid-commit → full rollback. No torn states, no partial arrays.
- **Consistency:** constraints (`NOT NULL`, `CHECK`, `FOREIGN KEY`, `UNIQUE`) are
  enforced by the engine, not by your Zod validators at write time.
- **Isolation:** concurrent writers serialize; a transaction sees a stable snapshot.
- **Durability:** with WAL + `synchronous=NORMAL`, committed transactions survive
  process death (and in practice power loss).

The offline-queue pattern that required Harvi's hand-rolled `withQueueLock` becomes:

```sql
BEGIN;
INSERT INTO pending_results (local_id, payload, status) VALUES (?, ?, 'pending');
COMMIT;
```

Atomic, crash-safe, indexed by `status`. The lock disappears because the engine is
the lock.

### 7.4 WAL Mode

**Write-Ahead Logging** (`PRAGMA journal_mode=WAL`) is the modern default for mobile:

- Readers never block the writer and vice versa.
- Writes append to the `-wal` file and are checkpointed back to the main DB
  asynchronously — dramatically better for Harvi's "frequent small writes" (each
  completed quiz, each queued result).
- Enables the **change listener** that powers live queries.

Trade-offs: WAL adds sidecar files (must be kept consistent for backups), and on
older Android it historically had edge cases. expo-sqlite manages the pragmas for
you in most flows.

### 7.5 Indexes, FTS, JSON1

Concrete Harvi futures this unlocks:

- `CREATE INDEX idx_pending_status ON pending_results(status);` → instant "flush
  everything pending" query.
- `CREATE INDEX idx_pending_user ON pending_results(user_id, created_at);` → "show
  my unsynced results, newest first."
- FTS5 virtual table over question text → "search all cached questions for
  'photosynthesis'" without loading the whole cache into JS memory.
- JSON1 + SQLite's JSON columns → store a Zod-validated payload blob as JSON in one
  column and still query inside it.

### 7.6 expo-sqlite API Landscape

`expo-sqlite` (SDK 54) is mature and actively maintained by the Expo team:

- **Two open modes:**
  - `openDatabaseSync(name)` → JSI-backed **synchronous** API (`getAllSync`,
    `runSync`, `execSync`, `withTransactionSync`). Fast, but blocks the JS thread —
    use for small quick queries or inside a transaction.
  - `openDatabaseAsync(name)` → asynchronous API (`getAllAsync`, `runAsync`,
    `execAsync`, `withTransactionAsync`, `withExclusiveTransactionAsync`). Runs on a
    background thread; the right choice for bulk loads and heavy queries.
- **`SQLiteProvider` / `useSQLiteContext()`** → React context wrapper that scopes a
  database to a component tree and gives hooks the connection.
- **Change listeners** (`onDatabaseChange`) + the **`useLiveQuery`** ecosystem →
  reactive SQL (see Drizzle below).
- **`enableChangeListener: true`** must be set on the database for live queries to
  fire.
- **SQLCipher** support exists for full-database encryption, but is **not available
  in Expo Go** (you're on a dev client — fine).
- Web: `expo-sqlite` has a WASM-based web implementation (`wa-sqlite`), so web
  support exists but with a different (async) surface and larger bundle.

### 7.7 Performance Model

| Aspect | Reality |
|---|---|
| Single indexed point read | ~tens of microseconds — faster than AsyncStorage, comparable to MMKV for lookups |
| Single write (WAL, NORMAL) | ~tens of microseconds to low ms depending on fsync policy |
| Bulk insert (prepared stmt + transaction) | thousands of rows/sec on a mid-range device |
| Heavy query on 100k rows with index | single-digit ms |
| Thread model | Sync API blocks JS thread; async API runs off-thread |
| Query capability | Full SQL: joins, aggregations, FTS, JSON |
| Transactions | First-class, ACID |

The practical rule: **SQLite is slower than MMKV at "get one string," comparable at
"get one row by key," and infinitely better at "give me a filtered, sorted, paged
subset" — which is the workload the KV stores cannot do at all.**

### 7.8 Pros

- **The actual database.** Querying, indexing, aggregation, joins — the data-level
  features KV stores structurally lack.
- **ACID transactions** — the offline queue stops being a hand-rolled lock.
- **Scalable** — comfortably handles 10s–100s of MB; the limit is disk, not the
  engine.
- **Industry-standard, boring, predictable.** The same engine runs on the server
  (Supabase is Postgres, but SQL is SQL) — your team's SQL skills transfer.
- **First-party Expo support** (`expo-sqlite`), with a synchronous and an
  asynchronous API, provider/context, and change listeners.
- **Single-file, portable** — you can pull the `.db` out of a device and inspect it
  in any SQLite tool for debugging.
- **Reactive options** — live queries via change listeners + Drizzle's `useLiveQuery`.
- **SQLCipher** for full encryption when needed.

### 7.9 Cons

- **You now have a schema and migrations.** Every schema change needs a migration
  for existing installs. That's real ongoing discipline (Drizzle softens it).
- **SQL is a language.** Raw `expo-sqlite` means stringly SQL — no compile-time
  safety, typo'd column names fail at runtime, and refactors are grep-based.
- **Sync API blocks the JS thread.** `getAllSync` of a 100k-row table will visibly
  stutter a low-end device. You must choose sync-for-small / async-for-large
  deliberately. (This is a real, open footgun in the Drizzle+expo-sqlite combo —
  see 8.6.)
- **Setup ceremony.** Metro/babel config if you bundle `.sql` migrations; migration
  running at startup (`useMigrations`); dev-tooling differences vs. AsyncStorage's
  "it just works."
- **Not in Expo Go for SQLCipher** (dev client only).
- **Bulk load UX** — importing the question bank is fast in a transaction, but the
  code path (async, progress reporting, re-open) is more code than AsyncStorage's
  `setItem`.

### 7.10 Verdict

**SQLite is the correct engine for Harvi's relational-shaped data: the offline
queue, the question cache (if it grows or needs querying), and any future search /
aggregation feature.** Its cost is schema discipline and SQL literacy; its reward is
atomicity, queryability, and scaling headroom that KV stores cannot offer. The one
permanent caveat is thread discipline: keep heavy queries on the async API.

---

## 8. Deep Dive: Drizzle ORM

### 8.1 What It Is

Drizzle is a **"headless TypeScript ORM"** — it generates SQL from typed schema
objects and query calls rather than managing an entity state (unlike heavier ORMs).
On mobile it pairs with `expo-sqlite` through the official driver
`drizzle-orm/expo-sqlite`. You define tables once in TypeScript; Drizzle provides a
query builder, migrations via `drizzle-kit`, live queries, and a dev-tools plugin.

### 8.2 Why an ORM on Mobile

Raw SQL in a growing React Native codebase accrues these costs:

- Column names are magic strings. Rename `lecture_id` and the compiler says
  nothing — only a runtime query does.
- No result typing. `getAllSync("SELECT * FROM …")` returns `any[]`-ish rows you
  must trust.
- No refactor safety. Grep-based schema changes across dozens of services.

Drizzle fixes exactly these:

```ts
// schema.ts — the single source of truth
export const pendingResults = sqliteTable("pending_results", {
  localId: text("local_id").primaryKey(),
  userId: text("user_id").notNull(),
  payload: text("payload").notNull(),
  status: text("status", { enum: ["pending", "synced", "failed"] })
    .default("pending")
    .notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// usage — column names and row types are compile-checked
const rows = await db
  .select()
  .from(pendingResults)
  .where(and(eq(pendingResults.userId, userId), eq(pendingResults.status, "pending")))
  .orderBy(asc(pendingResults.createdAt))
  .limit(50);
```

Both `rows` and the query are type-checked against the schema. This is the
refactor-safety AsyncStorage's string keys can never have.

### 8.3 Schema → Migrations → App

The workflow that makes mobile migrations tractable:

1. Define the schema in TypeScript (`db/schema.ts`).
2. Run `drizzle-kit generate` → it diffs your schema against the previous migration
   and emits `.sql` files.
3. Configure `babel-plugin-inline-import` (bundles `.sql` as strings) and add `sql`
   to metro's `sourceExts`.
4. Import migrations and run them at startup with `useMigrations(db, migrations)`.

Because each phone has its own isolated database, migrations must be **bundled into
the app** and applied on-device — this is the standard, solved pattern.

### 8.4 Live Queries

With `enableChangeListener: true` on the underlying `expo-sqlite` database, Drizzle's
`useLiveQuery` hook makes any query **reactive**:

```ts
const { data, error, updatedAt } = useLiveQuery(
  db.query.pendingResults.findMany({
    where: eq(pendingResults.userId, userId),
  }),
);
```

Any insert/update/delete — from any screen — re-runs the query and re-renders the
component. This replaces the manual "invalidate cache, refetch, setState" plumbing
that Harvi currently spreads across services and React Query keys.

### 8.5 Drizzle Studio

`expo-drizzle-studio-plugin` + `useDrizzleStudio(db)` adds a **dev-tools panel to the
Expo dev menu** (`shift+m`) where you can browse and edit the on-device database in
real time — the mobile equivalent of inspecting a database in a desktop GUI. Huge
for debugging offline queues ("why is this stuck as pending?").

### 8.6 Performance Model

- **Query generation overhead is negligible** — Drizzle emits plain, parameterized
  SQL; the generated query is what SQLite executes.
- **Bulk inserts:** use transactions + prepared statements; thousands of rows/sec.
- **The known footgun (real, current, open issue):** `drizzle-orm/expo-sqlite`
  **executes synchronously through expo-sqlite's sync API even when you `await`** —
  it does not use the async API. A heavy query (or a 1,000-row insert) **blocks the
  JS thread** until it finishes. Community patch-packages exist to route through
  `prepareAsync`/`executeAsync`, but vanilla Drizzle+expo-sqlite will jank on heavy
  workloads. Mitigation: keep Drizzle queries small, batch via transactions, insert
  in chunks with `await delay(0)` yields or an async adapter, and measure on a
  low-end device.

### 8.7 Pros

- **Compile-time safety** — typed schema, typed queries, typed results. Refactor-proof.
- **Official `expo-sqlite` driver** with a blessed workflow (schema → migrate → app).
- **`drizzle-kit` migration generation** — schema evolution without hand-writing SQL.
- **`useLiveQuery`** — reactive storage, less glue code.
- **Drizzle Studio** dev plugin — inspect on-device DB in the Expo dev menu.
- **Small and "headless"** — no runtime entity tracking, no magic; the generated SQL
  is visible and sane.
- **Relational query API** — `findMany`, `findFirst`, nested relations, `$with`
  CTEs — ergonomic for the exact queries Harvi's services hand-roll today.

### 8.8 Cons

- **Extra dependency + config ceremony** — drizzle-orm, drizzle-kit, babel plugin,
  metro `sourceExts`, drizzle.config.ts. One-time setup, ongoing maintenance.
- **The sync-execution footgun (8.6)** — biggest practical risk; must be understood
  and mitigated or you trade AsyncStorage jank for SQLite jank.
- **You're still writing SQL indirectly** — raw SQL escape hatches exist but break
  the type-safety guarantee.
- **Migration discipline is mandatory** — every schema change must generate and
  test a migration; a broken migration bricks the offline layer for existing users.
- **Version churn** — Drizzle ships frequently (`@rc`/`@next` tags are common in its
  own docs); pin versions and read changelogs.
- **Abstraction tax for trivial cases** — storing one theme flag through Drizzle is
  absurd. Drizzle is for *data*, not *state*.

### 8.9 Verdict

**Drizzle is the correct *ergonomics* layer on top of SQLite for Harvi's data tables
— especially the offline queue and question cache — because it makes the schema
explicit, migrations safe, queries type-safe, and the DB inspectable.** Its value is
proportional to how much *queryable* data you have. If Harvi never queries anything,
Drizzle is ceremony; but the moment you add "filter pending queue," "search
questions," or "aggregate progress," it pays for itself. The sync-thread footgun must
be engineered around, not ignored.

---

## 9. Head-to-Head Comparison

### 9.1 The Feature Matrix

| Dimension | AsyncStorage | MMKV | SQLite (expo-sqlite) | SQLite + Drizzle |
|---|---|---|---|---|
| Data model | String KV | Typed KV (string/number/bool/bytes) | Relational (tables/SQL) | Relational + typed schema |
| API style | Async, Promise | **Synchronous**, JSI/Nitro | Sync (`*Sync`) + Async (`*Async`) | Query builder (sync-backed) |
| Read before first render | No (async) | **Yes** | Yes (sync API) | Yes (sync-backed) |
| Querying / filtering / joins | None | None | **Full SQL** | **Full SQL, type-safe** |
| Indexes | None | None | **Yes** | **Yes** |
| Transactions (ACID) | No (manual lock) | No | **Yes** | **Yes** |
| Partial updates | No (rewrite blob) | No | **Yes (UPDATE ... SET)** | **Yes** |
| Encryption | No (pair SecureStore) | **Built-in AES** | SQLCipher (dev client only) | SQLCipher via expo-sqlite |
| Per-user namespacing | String prefix + manual cleanup | **Instances** (`clearAll()`) | WHERE user_id = ? | WHERE user_id = ? |
| Change listeners | No | **Yes** | Yes (`onDatabaseChange`) | **`useLiveQuery`** |
| Expo Go | **Yes** | No | Yes (except SQLCipher) | Yes (except SQLCipher) |
| Web support | **First-class** | Fallback (no encryption) | WASM (async surface) | WASM (via expo-sqlite) |
| Setup ceremony | None | Config plugin (dev client) | Moderate | **Heaviest** (babel/metro/drizzle-kit) |
| Native size impact | Small | ~200 KB | Small-moderate | Small-moderate |
| Data capacity | ~6 MB default (Android), low-tens MB realistic | Practical for MBs of small values | **Hundreds of MB** | **Hundreds of MB** |
| Schema/migrations | None (version keys by hand) | None | Manual PRAGMA user_version | **drizzle-kit generated** |
| Dev tooling | Basic | Basic | SQLite tools / DB Pro | **Drizzle Studio in dev menu** |
| Open-source maturity | Very high | High (Tencent core) | Very high (SQLite) | High (35k+ stars) |
| Runtime safety | Strings + your Zod | Typed getters | Raw rows | **Compile-time typed rows** |

### 9.2 Benchmark Tables

**Single-operation latency (typical mid-range device, 2025–26 measurements):**

| Operation | AsyncStorage | MMKV | SQLite (indexed, async) |
|---|---|---|---|
| Get 1 small key | ~1–3 ms | ~0.01–0.5 ms | ~0.05–0.5 ms |
| Set 1 small key | ~1–3 ms | ~0.05–0.6 ms | ~0.1–1 ms |
| Read 1,000 keys | ~1–2.5 s | ~0.1 s | ~0.2–0.5 s (indexed) |
| Filter 10k rows | N/A (must parse whole blob) | N/A | ~1–10 ms (with index) |
| Bulk insert 10k rows | ~seconds (blob rewrite) | ~seconds (blob rewrite) | ~100–500 ms (transaction + prepared) |

**Order-of-magnitude takeaway:** the single-op gap is ~5x (AsyncStorage → MMKV). The
*workload* gap for anything queryable is "infinity" — the KV stores simply cannot
answer the question.

**The "30x" claim, decoded:** MMKV's 30x is real *for loops of small synchronous
reads* (the hydration case). A few scattered single ops are ~5x. One published
contrarian benchmark shows AsyncStorage winning on 150k-key state-tree hydration due
to native batching. **Conclusion: measure your workload, not the headline.**

### 9.3 Memory Profiles

- **AsyncStorage:** your data lives in the DB/file on the native side *plus* whatever
  JS copies you materialize (`JSON.parse` allocates a full JS object tree). Every
  read of a large blob pays a transient peak of ~2x the blob size in JS heap.
- **MMKV:** data lives in the mapped file; reads return values without building a
  whole-object tree (typed getters). Lower steady-state JS heap. The mmap occupies
  virtual address space proportional to file size — fine for small values, wasteful
  for huge files.
- **SQLite:** pages are cached in the page cache (tunable, `PRAGMA cache_size`);
  result rows are materialized only as you iterate/prepare. For bulk work with
  `LIMIT`/`OFFSET` you only hold the page you need in JS, not the whole dataset.

**The memory lesson for Harvi:** the question-cache and hierarchy-cache blobs, when
read via AsyncStorage, are fully materialized into JS object trees on every access.
With SQLite they'd be pages + row iteration. The difference is most visible on
low-end Android with 2–3 GB RAM — which, per Harvi's own AGENTS.md guidance, is the
device class to care about.

### 9.4 Concurrency and Data Integrity

| Scenario | AsyncStorage | MMKV | SQLite |
|---|---|---|---|
| Two JS tasks write same key | Last-write-wins; may interleave without your lock | Same; sync calls reduce the window | Engine serializes; transactions atomic |
| Crash mid-multi-key update | Partial state (no transaction) | Partial state | **Rollback to consistent state** |
| Queue append (read-modify-write) | Needs hand-rolled lock (Harvi: `withQueueLock`) | Needs hand-rolled lock | **Atomic `INSERT`** |
| Corrupt payload | You detect via Zod (Harvi does) | CRC detects file corruption | Engine enforces; `PRAGMA integrity_check` |
| Power loss mid-write | Value may be torn | Latest writes may not flush (CRC catches corruption) | WAL + NORMAL: committed txns survive |

**The decisive sentence:** AsyncStorage and MMKV both require the *application* to
enforce invariants (locks, read-modify-write discipline). SQLite enforces them in the
*engine*. For an offline queue where a lost item is lost user progress, that
difference is worth real money.

### 9.5 Security and Encryption

- **AsyncStorage:** plaintext on disk. Any exfiltrated backup / rooted device read
  exposes caches. Correct posture: only non-sensitive cache data; secrets in
  `expo-secure-store`.
- **MMKV:** built-in AES with keychain-backed key = solid at-rest encryption for
  bulk data. Still keep biometric-gated secrets in SecureStore.
- **SQLite:** plaintext by default; **SQLCipher** for full-DB encryption (requires a
  dev client build; add a compile-time flag). SQLCipher + Drizzle works because
  Drizzle just talks to expo-sqlite.
- **Harvi today:** already uses `expo-secure-store` for auth — correct. The quiz
  queue payloads contain user progress, not secrets — plaintext is defensible; if
  you ever queue tokens/payments, move those to SecureStore or SQLCipher.

**The golden rule, restated:** *secrets → SecureStore; bulk at-rest data that needs
encryption → MMKV (small values) or SQLCipher/SQLite (relational); cache → any.*

### 9.6 Backup and Restore Behavior

- **AsyncStorage (Android):** participates in Android Auto Backup / device restore —
  cache data can come back on reinstall (good for offline UX, bad if you expect a
  clean slate on logout).
- **MMKV:** files are excluded from iCloud backup by default (iOS); Android backup
  behavior is file-location dependent. Treat MMKV as "restore-friendly cache" and be
  deliberate.
- **SQLite:** single file — back it up consistently with the `-wal` sidecar; restore
  by copying the file back. Predictable, scriptable, testable.

Harvi impact: `cacheUtils.clearUserCaches()` exists to scrub user-scoped AsyncStorage
on sign-out. Whatever engine you migrate to must preserve that guarantee — an
instance-based MMKV (`clearAll()`) actually makes it *cleaner*.

### 9.7 Developer Tooling

- **AsyncStorage:** nothing built-in; you eyeball JSON in logs, or use
  `getAllKeys()` debug dumps. (Harvi already has `getAllKeys`-based cleanup in
  `questionCache.ts`.)
- **MMKV:** `getAllKeys()`/`getAllValues()` dump; basic.
- **SQLite:** any SQLite GUI can open the device DB (pull it via adb / dev client);
  `PRAGMA integrity_check`; `EXPLAIN QUERY PLAN` for query tuning.
- **SQLite + Drizzle:** **Drizzle Studio in the Expo dev menu** (`shift+m`) — browse
  and edit on-device tables live. This alone is a strong argument for adopting
  Drizzle for data tables: "why is this queue item stuck?" becomes a 5-second
  inspection instead of a logging expedition.

### 9.8 Ecosystem, Maintenance, and Future-Proofing

- **AsyncStorage:** mature, but the project's own roadmap (SQLite backend, "Next"
  storage) signals the async-bridge design is a legacy tax they are removing.
- **MMKV:** actively maintained (v4 = NitroModule, 2026); the binding's vitality
  depends on one primary maintainer plus the Tencent core.
- **SQLite:** the most durable dependency in software. The engine will outlive the
  app.
- **Drizzle:** fast-moving and well-funded by adoption; `@rc` churn means pinning and
  disciplined upgrades. Community patch exists for the async-API gap, which is a
  smell the maintainers should eventually fix.

**Future-proofing summary:** the only storage layer you can adopt today that you
won't need to re-architect in 3 years is **SQLite**. KV engines will keep evolving
underneath you; relational data and SQL are permanent.

---

## 10. Trade-Offs, Wins, and Losses — An Honest Scorecard

Let's stop being polite and assign a real verdict to each pairing, from the
perspective of *Harvi as it exists today*.

### AsyncStorage vs. MMKV (the KV duel)

| Axis | Winner | Why |
|---|---|---|
| Raw speed (single op) | MMKV | ~5x |
| Speed (many ops / hydration) | MMKV | ~20–30x; sync loops |
| Cold-start UX | MMKV | Read before first render |
| Encryption | MMKV | Built-in vs. none |
| Namespacing / logout cleanup | MMKV | Instances + clearAll |
| Zero-config / Expo Go | AsyncStorage | Only one that just works everywhere |
| Web parity | AsyncStorage | MMKV web is a fallback |
| Durability strictness | AsyncStorage | SQLite commit vs. best-effort flush |
| Simplicity for juniors | AsyncStorage | No instances, no keys, no sync traps |

**Verdict:** MMKV wins every axis that matters for a *production* app except
"zero-config" and "web parity." If Harvi ships via EAS dev-client builds (it does —
`expo-dev-client` is in the dependency tree) and treats web as secondary, **the
KV-shaped data should move to MMKV.**

### AsyncStorage vs. SQLite (the category clash)

There is no axis where AsyncStorage beats SQLite for *queryable* data, because SQLite
has a feature AsyncStorage structurally lacks. The honest framing:

- If your data is a **blob you always read whole** → AsyncStorage is arguably fine.
- If your data is a **collection you filter/sort/aggregate/update-in-place** →
  SQLite wins by an unbounded margin, and AsyncStorage's read-modify-write pattern
  actively *costs* you correctness (the queue) and complexity (the lock).

**Verdict:** Harvi's offline queue, question cache, and progress ledger are
collections. They belong in SQLite. This is not a close call.

### SQLite raw vs. SQLite + Drizzle

| Axis | Winner | Why |
|---|---|---|
| Setup ceremony | Raw SQLite | Fewer moving parts |
| Type safety / refactor safety | Drizzle | Compile-checked schema and queries |
| Migrations | Drizzle | drizzle-kit diffs schema for you |
| Dev UX | Drizzle | Studio + live queries |
| Runtime performance | Raw (equal) | Drizzle emits equivalent SQL; both share the sync-thread caveat |
| Team SQL literacy | Raw | If the team knows SQL, raw is less indirection |

**Verdict:** For a codebase that already enforces "TypeScript Safety Rules," Zod,
and strict typing (Harvi's AGENTS.md), **Drizzle is the philosophically consistent
choice** — the same discipline that bans `any` should not then hand-roll stringly
SQL in services.

### The grand scorecard for Harvi

| Harvi workload | Best engine | Current engine | Migration value |
|---|---|---|---|
| Theme / avatar / display name | MMKV | AsyncStorage | Medium (cold-start + sync read) |
| Per-user stats / progress / best-scores / access warm caches | MMKV (small hot) or SQLite (if queryable) | AsyncStorage | Medium–High |
| Question cache (per lecture) | SQLite + Drizzle | AsyncStorage | High (queryability + no blob rewrite) |
| Offline quiz queue | **SQLite + Drizzle** | AsyncStorage + lock | **Highest (atomicity + no O(n²))** |
| Auth tokens | expo-secure-store (keep) | expo-secure-store ✅ | None — already correct |

---

## 11. Decision Framework

### 11.1 Decision Trees

**Tree 1 — For any single piece of data, which engine?**

```
 Is it a secret (token, biometric, payment)?
 └─ YES → expo-secure-store. STOP.
 └─ NO ↓

 Do you need to QUERY it (filter, sort, join, aggregate, count)?
 └─ YES → SQLite (+Drizzle for type safety & migrations). STOP.
 └─ NO ↓

 Is it a small, hot value that must be readable before first render,
   or needs encryption, or needs per-user namespaces?
 └─ YES → MMKV. STOP.
 └─ NO ↓

 Is web parity essential and is this tiny & low-frequency?
 └─ YES → AsyncStorage (or keep legacy). STOP.
 └─ NO → MMKV (default in 2026).
```

**Tree 2 — Should Harvi adopt SQLite + Drizzle at all?**

```
 Do you store any COLLECTION you filter/aggregate/update-in-place?
 └─ Offline queue        → YES (pending vs synced, flush subset)
 └─ Question cache       → YES (or future search / paging)
 └─ Progress ledger      → YES (counts, per-lecture lookup)
 └─ All three NO         → skip SQLite; MMKV-only is fine
```

**Tree 3 — Migration sequencing**

```
 Is there a plan + rollback for each cutover?
 Is there a one-time one-way data copy (AsyncStorage → SQLite) tested on device?
 Is there a dual-write window with a kill switch?
 └─ ALL YES → proceed phase-by-phase (see §12.4)
 └─ ANY NO  → stop; stabilize current AsyncStorage first.
```

### 11.2 When AsyncStorage Wins

- You are prototyping or working inside **Expo Go** without a dev client.
- **Web is a first-class target** and you want one API everywhere.
- The data is **tiny, low-frequency, non-sensitive, never queried**.
- The team needs **zero configuration** and the failure budget is high.
- Legacy keys you haven't migrated yet — keep them readable during the transition.

### 11.3 When MMKV Wins

- **Cold start latency matters** (it does — it's an offline-first learning app).
- You need **synchronous reads before first render**.
- You want **encryption without a second dependency** (keychain-backed key).
- You want **clean per-user namespaces** with one-call logout cleanup.
- You want **typed getters** and change listeners / hooks.
- Production builds ship via dev client / EAS (Harvi: yes).

### 11.4 When SQLite Wins

- Any **queryable collection** — even a small one that *will* be queried.
- **Transactional correctness** (offline queue, any multi-step mutation).
- **Scale** beyond a few MB.
- **Future features** like full-text search over question content.

### 11.5 When Drizzle Wins

- You want **compile-time type safety** over your local schema (matches Harvi's
  TS-rules culture).
- You want **generated migrations** instead of hand-written `user_version` logic.
- You want **live queries** to replace manual cache invalidation.
- You want **Studio** to debug the on-device DB.
- You accept the setup ceremony and the sync-thread caveat.

### 11.6 The Hybrid Architecture (Recommended)

The 2026 production-default for a serious offline-first RN app:

```
┌───────────────────────────────────────────────────────────────┐
│                    LAYERED STORAGE ARCHITECTURE               │
│                                                               │
│  ┌──────────────────┐  ┌───────────────────────────────────┐  │
│  │  expo-secure-store│  │  MMKV  (instances per user)      │  │
│  │  auth tokens,     │  │  theme, avatar, flags,           │  │
│  │  refresh tokens,  │  │  warm user caches (small),       │  │
│  │  MMKV key         │  │  sync reads at cold start        │  │
│  └──────────────────┘  └───────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  SQLite  (expo-sqlite, one db, one schema)              │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  Drizzle ORM (types + migrations + live queries)   │ │ │
│  │  │  ─ pending_results (offline queue)                 │ │ │
│  │  │  ─ question_cache                                  │ │ │
│  │  │  ─ progress_ledger                                 │ │ │
│  │  │  ─ stats / best_scores / access                    │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                               │
│  AsyncStorage → legacy read shim during migration, then      │
│  retired (or kept only for web builds).                      │
└───────────────────────────────────────────────────────────────┘
```

Why this specific split:

- **MMKV holds state** (things you look up by exact key, synchronously).
- **SQLite holds data** (things you query).
- **SecureStore holds secrets** (and the MMKV encryption key).
- **AsyncStorage** is the casualty — every one of its current jobs moves to one of
  the above, and its web story is handled by a thin adapter if web ever matters.

This is not opinion; it is where the ecosystem converged after AsyncStorage's
performance characteristics became well-understood. It is also what Harvi's own
three-tier architecture (memory → disk → Supabase) *wants* to be, once the disk tier
is split by shape.

---

## 12. Harvi-Specific Analysis

### 12.1 Current Storage Map

| Key pattern | Service | Data shape | Access pattern | Verdict |
|---|---|---|---|---|
| `harvi:theme` | `themeStore.tsx` | string | sync-ish (one read) | → MMKV |
| `harvi:avatar`, `harvi:displayName` | `useProfileEdit/Data.ts` | string | read/write, low freq | → MMKV |
| `harvi:quiz_queue` | `offlineQueue.ts` | **array of objects** | **read-all + write-all** | → SQLite table (highest priority) |
| `harvi:questionCache:<id>` | `questionCache.ts` | JSON blob | per-lecture read/write | → SQLite (or MMKV if small) |
| `harvi:hierarchyCache` | `hierarchyService.ts` | JSON blob | read-all, then serve | → SQLite table per entity |
| `harvi:progress:<userId>` | `progressService.ts` | Set of IDs | read-set + write-set | → SQLite ledger or MMKV set |
| `harvi:bestScores:<userId>` | `bestScoreService.ts` | map | read-all + write-all | → SQLite or MMKV |
| `harvi:stats:<userId>` | `statsService.ts` | JSON blob | read-all + write-all | → SQLite or MMKV |
| `harvi:access:<userId>` | `accessService.ts` | map | read-all + write-all | → SQLite or MMKV |
| `harvi:quiz:fkcol` | `questionService.ts` | string | read once | → MMKV |
| (auth) | authStore / expo-secure-store | secrets | — | ✅ keep |

### 12.2 Line-by-Line Review of Harvi's Patterns

**`offlineQueue.ts` — the quadratic read-modify-write (the biggest smell).**

```ts
async function readQueue(): Promise<PendingQuizResult[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);      // 1) load ENTIRE queue
  ...
}

async function writeQueue(queue: PendingQuizResult[]): Promise<void> {
  const payload = JSON.stringify(queue);                  // 2) serialize ENTIRE queue
  await AsyncStorage.setItem(QUEUE_KEY, payload);         // 3) rewrite ENTIRE queue
}
```

- Every `enqueueQuizResult` copies the whole history. 100 queued results = 100
  full serializations of growing data.
- The `withQueueLock` promise chain is *correct* but it serializes the entire
  app's queue traffic behind one lock — and it only protects the queue's own
  mutations, not other services.
- The double-write retry on failure is defensive and good — SQLite's `INSERT` in a
  transaction simply doesn't need it.

**The "warm memory cache" pattern** (`warmStatsCache`, `warmProgressCache`,
`progressService` lines 85–89) — the essence:

```ts
// Warm memory cache from AsyncStorage, called once per session
```

This pattern exists **because AsyncStorage reads are async**. With MMKV the "warm"
step disappears (sync read). With SQLite, the equivalent is a query memoized by
React Query — you already have the React Query layer.

**`multiGet` / `multiRemove` batching** (`useProfileData.ts`, `cacheUtils.ts`,
`questionCache.ts`) — this is the correct AsyncStorage pattern; it amortizes bridge
cost. But `cacheUtils.clearUserCaches()` shows the manual key-enumeration burden:

```ts
await AsyncStorage.multiRemove(keys);   // must know every key pattern per user
```

MMKV's per-user instance turns this into one `clearAll()`. SQLite turns it into one
`DELETE FROM cache WHERE user_id = ?`. Both are strictly simpler.

**Zod validation everywhere** (`readQueue` uses `z.array(PendingQuizResultSchema)`) —
excellent defensive practice for AsyncStorage, and it should *stay* for the
migration path (reading legacy blobs). Once data lives in a typed SQLite schema,
the engine provides the invariant and the Zod layer can move to the boundaries
(what you send to Supabase).

### 12.3 The Three Real Wins Available to Harvi

Ranked by value-to-risk:

1. **Win #1 — SQLite table for the offline queue.** Highest value (correctness +
   removes O(n²) + removes the lock) and lowest risk (the queue is small, isolated,
   and fully reconstructible — it's pending uploads, and Supabase is the source of
   truth).
2. **Win #2 — MMKV for cold-start state.** Theme, avatar, fkcol, and the warm user
   caches move to sync reads. Removes the "flash-then-hydrate" behavior and the
   warmup ceremony. Medium value, low risk.
3. **Win #3 — SQLite+Drizzle for content caches.** Question cache and hierarchy as
   typed tables with indexes, live queries, and Studio debugging. Highest future
   payoff (search, paging, aggregation), highest effort — do it only when a
   queryable feature actually needs it (YAGNI until then).

**Deliberate non-wins:** don't rewrite stats/progress/best-scores *just* to rewrite
them. They're blobs you read whole; MMKV is a drop-in that already pays the dividend.
Only move them to SQLite when you need to query them.

### 12.4 Migration Roadmap (Phased)

**Phase 0 — Instrument and measure (1 sprint, no code behavior change).**
- Add a thin storage interface (`ILocalStore`) in front of AsyncStorage today so
  engines can be swapped behind it. Record: cold-start hydration time, per-service
  read/write latencies, queue size distribution. Establish the before-numbers to
  justify the after.

**Phase 1 — Queue to SQLite (highest value).**
- Create `pending_results` table via expo-sqlite (+ Drizzle schema + migration).
- Reimplement `enqueueQuizResult`, `readQueue`, `flushQueue`, `removeFromQueue` over
  the table. Keep `withQueueLock`? No — the DB transaction *is* the lock; keep a
  single `withTransactionAsync` wrapper for flush-vs-enqueue mutual exclusion.
- **One-time migration:** on app boot, if legacy `harvi:quiz_queue` exists, insert
  rows and delete the key. Ship, observe, keep the legacy path behind a flag for a
  release.

**Phase 2 — Cold-start state to MMKV.**
- Add `react-native-mmkv` (config plugin; Harvi is on dev-client, so fine).
- Create `defaultStorage` + optional `userStorage(userId)` instance whose encryption
  key lives in `expo-secure-store`.
- Migrate `themeStore`, profile keys, `harvi:quiz:fkcol`, and the warm user caches.
- Dual-read legacy AsyncStorage for one release, then delete.

**Phase 3 — Content caches to SQLite+Drizzle (only when needed).**
- Tables: `questions`, `lecture_progress`, `best_scores`, `stats`, `access_map`
  (normalize hierarchy into `year/module/subject/lecture` rows if you want real
  queries).
- Migrate services to Drizzle; adopt `useLiveQuery` where React Query doesn't
  already cover it; wire Drizzle Studio for debugging.
- **Exit criteria for Phase 3:** you have a *feature* (search, offline leaderboard,
  per-lecture progress queries) that justifies the schema. YAGNI otherwise.

**Phase 4 — Retire AsyncStorage.**
- Delete the legacy read shims; remove `@react-native-async-storage/async-storage`
  if web doesn't need it. Update `docs/STATE_MANAGEMENT.md` to describe the new
  disk tier.

### 12.5 Code Examples for Each Phase

**Phase 1 — the queue, with Drizzle (illustrative):**

```ts
// db/schema.ts
export const pendingResults = sqliteTable("pending_results", {
  localId: text("local_id").primaryKey(),
  userId: text("user_id").notNull(),
  lectureId: text("lecture_id").notNull(),
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  payload: text("payload").notNull(), // Zod-validated JSON, kept for Supabase
  status: text("status", { enum: ["pending", "synced", "failed"] }).default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
export const queueIdxStatus = index("queue_idx_status").on(
  pendingResults.status,
  pendingResults.createdAt,
);

// db/client.ts
import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseAsync } from "expo-sqlite";
const expo = await openDatabaseAsync("harvi.db");
export const db = drizzle(expo);

// services/offlineQueue.ts (new core)
export async function enqueueQuizResult(item: PendingQuizResultInput) {
  await db.insert(pendingResults).values({
    localId: generateUUID(),
    userId: item.userId,
    ...item,
    createdAt: new Date(),
  }); // atomic INSERT — no lock, no read-modify-write
}

export async function flushPending(userId: string) {
  const rows = await db
    .select()
    .from(pendingResults)
    .where(eq(pendingResults.userId, userId))
    .orderBy(asc(pendingResults.createdAt))
    .limit(50);
  // POST to Supabase, then:
  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx.update(pendingResults).set({ status: "synced" }).where(eq(pendingResults.localId, row.localId));
    }
  });
}
```

**Phase 2 — MMKV setup:**

```ts
// storage/mmkv.ts
import { MMKV } from "react-native-mmkv";
import * as SecureStore from "expo-secure-store";

const KEY = "harvi.mmkv.key";
async function getOrCreateKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const fresh = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await SecureStore.setItemAsync(KEY, fresh);
  return fresh;
}

export async function createUserStorage(userId: string) {
  const key = await getOrCreateKey();
  return new MMKV({ id: `harvi-${userId}`, encryptionKey: key });
}

// themeStore.tsx — sync read at module load
const theme = defaultStorage.getString("harvi:theme"); // no await, no flash
```

**Phase 3 — a queryable question table + live query (illustrative):**

```ts
const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  lectureId: text("lecture_id").notNull(),
  prompt: text("prompt").notNull(),
  options: text("options", { mode: "json" }).notNull(),
  correctIndex: integer("correct_index").notNull(),
});
export const qIdx = index("questions_lecture_idx").on(questions.lectureId);

// hooks/useQuestions.ts
export function useQuestions(lectureId: string) {
  return useLiveQuery(
    db.select().from(questions).where(eq(questions.lectureId, lectureId)),
  );
}
```

---

## 13. Production Best Practices

### 13.1 The Anti-Patterns Hall of Shame

1. **The quadratic queue.** Read-all / mutate / write-all of a growing array. Fix:
   SQLite append or MMKV append-at-key-level.
2. **JSON blobs you query in JS.** "Get the blob, `JSON.parse`, `filter` in JS."
   The moment you filter, the engine should have done it.
3. **Storing secrets in AsyncStorage.** Plaintext auth tokens. Fix: `expo-secure-store`.
4. **Hardcoding the MMKV encryption key.** Fix: generate + store in keychain.
5. **Changing the MMKV key without re-encrypting.** Silent decrypt failures at next
   launch. Fix: read → new instance → write → clear old.
6. **Heavy queries on the sync API.** `getAllSync` of 100k rows on the JS thread.
   Fix: async API for bulk; measure on low-end Android.
7. **Drizzle + expo-sqlite sync-execution surprise.** `await` a big Drizzle query and
   the JS thread still blocks. Fix: chunk, yield (`await delay(0)`), or use an
   async-adapter patch; measure.
8. **No schema discipline.** Changing a stored object's shape without a migration →
   silent Zod failures or corrupted caches. Fix: Drizzle migrations or explicit
   versioned keys with `migrate()`.
9. **Dual-write hell.** Writing the same key to AsyncStorage *and* MMKV. Stale-data
   debugging becomes impossible. Fix: one owner per key; read-shims only during a
   bounded migration.
10. **Logout leaks.** Signing out a user but not clearing their per-user storage.
    Fix: per-user MMKV instance + `clearAll()`, or SQLite `DELETE ... WHERE user_id`.
11. **Ignoring backup semantics.** Putting must-restore data in an iCloud-excluded
    MMKV instance. Fix: know where your data does/doesn't get backed up.
12. **Blob-sized single MMKV values.** mmap virtual-address bloat + sync-block risk.
    Fix: files (expo-file-system) or SQLite BLOB/table.

### 13.2 Testing Strategies

- **Unit-test the service layer, not the engine.** Inject a fake `ILocalStore`
  (in-memory map) for AsyncStorage-backed services. For Drizzle, run the same schema
  against an in-memory SQLite (`:memory:`) in a Node test.
- **Mock native modules** (MMKV / expo-sqlite) in Jest with in-memory implementations
  that mirror the same method signatures — never let tests touch real JSI.
- **Test migrations.** Apply migration N→N+1 to a DB seeded at N; assert schema and
  data. Do this in CI for every schema change.
- **Test the one-time legacy→new copy** with fixture payloads (including one *corrupt*
  Zod-rejected payload, asserting graceful handling).
- **Device truth-tests:** a low-end Android device with a 10k-row question cache,
  measuring cold-start and queue-flush latency before/after. Store the numbers next
  to the code so the next architect has evidence.
- **`PRAGMA integrity_check`** in a debug screen / dev build to catch corruption
  early.

### 13.3 Observability

- Log (dev-only) per-service storage latency, queue length, and hydration time.
  Harvi already strips console logs in production via
  `babel-plugin-transform-remove-console` — keep storage telemetry behind a
  dev/opt-in flag or a lightweight event buffer.
- Surface queue health in the UI (`OfflineBanner` already reads the pending count) —
  if you move the queue to SQLite, keep that count cheap (`COUNT(*) WHERE status='pending'`).
- Drizzle Studio in dev builds for manual inspection; a debug-only "reset local DB"
  screen for QA.

### 13.4 Offline Sync Pitfalls

- **Idempotency:** when flushing the queue, a retried payload must not double-apply
  server-side. Keep `localId` stable and dedupe on the server keyed by it.
- **Ordering:** flush strictly in `createdAt` order; a failed middle item shouldn't
  starve later ones — mark it `failed`, continue, retry with backoff (Harvi already
  does exponential backoff in `syncStore`).
- **Conflict policy:** define optimistic-vs-server winner rules *before* you have
  conflicts (e.g., best score = max, progress = union of completed IDs). Harvi's
  merge semantics already encode these — preserve them in the new engine.
- **WAL sidecar during backup:** if you snapshot the SQLite file, include `-wal`/`-shm`
  or checkpoint first.
- **User switching:** the per-user instance/`user_id` split must make it impossible
  for user A to see user B's cached state.

---

## 14. Myths and FAQ

**Myth: "AsyncStorage has a 6 MB limit, period."**
Partly true, mostly folklore. The 6 MB cap is Android-only, configurable via
`AsyncStorage_db_size_in_MB`, and the failure mode is documented but avoidable.
iOS historically had no such cap. The real issue isn't the cap — it's that *before*
the cap you already feel the performance (async bridge + JSON + no querying).

**Myth: "MMKV is 30x faster than AsyncStorage, always."**
The 30x figure is workload-specific (loops of small synchronous reads). Single ops
are ~5x. One contrarian benchmark found AsyncStorage faster for very large state
trees. Order-of-magnitude: MMKV is dramatically faster for hot paths; measure your
own payloads.

**Myth: "SQLite is slow on mobile."**
The *old* React Native SQLite drivers (async, bridge-heavy) were slow. `expo-sqlite`
with JSI sync + async APIs and prepared statements is fast — single indexed lookups
are microseconds-to-ms, bulk inserts are thousands of rows/sec. Slow SQLite is
usually a missing index, a full-table scan, or an accidental sync-API call.

**Myth: "You must pick ONE storage engine."**
No. Production apps are hybrids. The question per dataset is *state or data, hot or
cold, queried or not, secret or not*. The layered architecture in §11.6 is the
norm.

**Myth: "Drizzle makes SQLite slower."**
Drizzle emits plain parameterized SQL. The overhead is negligible. The real perf
trap is the expo-sqlite sync-execution behavior (§8.6), which exists with or without
Drizzle. Use the async API for heavy work.

**FAQ: Is MMKV secure for auth tokens?**
Use `expo-secure-store` for the token; use MMKV (keychain-backed key) for bulk data.
MMKV's AES is fine at rest, but the key must be out of JS reach, and biometric-gated
secrets belong in a dedicated secure store.

**FAQ: Can MMKV/SQLite run in Expo Go?**
MMKV: no (native module → dev client). SQLite: yes, via expo-sqlite (SQLCipher
excluded). Since Harvi is on `expo-dev-client`, neither is a blocker.

**FAQ: Does the web target matter for this decision?**
Harvi includes `react-native-web`. On web, AsyncStorage maps to `localStorage`
(perfect), MMKV has a fallback (no encryption), and expo-sqlite uses WASM (async
surface, bigger bundle). If web becomes primary, budget a thin adapter and treat
storage as an abstraction. If mobile is primary (it is), don't let web hold you
hostage.

**FAQ: What about Realm / WatermelonDB / other engines?**
Realms: abandoned (Realm deprecated its RN SDK; MongoDB killed the JS SDK).
WatermelonDB: an excellent sync-focused layer *over* SQLite (it IS SQLite under the
hood), useful if you want offline-first sync out of the box; heavier abstraction than
Drizzle. This playbook scopes to AsyncStorage / MMKV / SQLite / Drizzle as asked.

**FAQ: Should I keep Zod validation if I adopt SQLite?**
Yes, at the boundaries (what you insert into the queue, what you send to Supabase).
The engine enforces *structure* (types, NOT NULL, constraints); Zod still validates
*semantics* of untrusted input. Harvi's Zod usage stays valuable.

**FAQ: How do I keep React Query in the picture?**
React Query remains the server-state layer (network). SQLite becomes the persistent
cache/queue, MMKV the sync flags. The pattern "React Query fetch → write-through to
SQLite → hydrate from SQLite on cold boot" is exactly Harvi's existing three-tier
model with a better disk tier.

---

## 15. Glossary

- **ACID** — Atomicity, Consistency, Isolation, Durability. The four guarantees of a
  transactional database.
- **AsyncStorage** — Community-maintained async key-value storage for React Native;
  Harvi's current persistent layer.
- **Bridge** — The legacy async JS↔native communication mechanism in React Native
  (JSON messages). Superseded by JSI on the new architecture.
- **CRC (Cyclic Redundancy Check)** — Checksum used by MMKV to detect file
  corruption.
- **Drizzle ORM / drizzle-kit** — TypeScript ORM + migration CLI for SQLite (and
  others); pairs with expo-sqlite.
- **expo-secure-store** — Expo wrapper around iOS Keychain / Android Keystore for
  small secrets.
- **expo-sqlite** — Expo's first-party SQLite binding; provides sync and async APIs.
- **FTS5** — SQLite's full-text search virtual table module.
- **JSI (JavaScript Interface)** — The C++ API letting JS call native code directly,
  synchronously, without the bridge.
- **JSON1** — SQLite extension for querying JSON values in SQL.
- **Key-value (KV) store** — Storage addressed by key alone; no query language.
- **mmap (memory-mapped file)** — Technique mapping a file into virtual memory;
  reads become memory reads; used by MMKV.
- **MMKV** — Tencent's key-value storage engine (via react-native-mmkv) built on
  mmap + protobuf-style encoding; synchronous JSI access.
- **NitroModules** — Modern synchronous React Native native-module system (used by
  MMKV v4).
- **ORM** — Object-relational mapping: code-level representation of relational
  schema and queries.
- **Prepared statement** — A compiled SQL query that can be re-executed with bound
  parameters efficiently.
- **SQLCipher** — Encrypted fork of SQLite.
- **SQLite** — Serverless, embedded, ACID relational database; ships with iOS/Android.
- **TurboModules** — The new-architecture native-module system (optimized bridge).
- **WAL (Write-Ahead Logging)** — SQLite journal mode allowing concurrent readers +
  a writer and faster commits.
- **Zustand persist** — Zustand middleware for persisting store state; accepts a
  synchronous (MMKV) or async (AsyncStorage) storage adapter.

---

## 16. References

1. React Native AsyncStorage docs — storage limits & internals:
   https://react-native-async-storage.github.io/async-storage/docs/limits and
   https://react-native-async-storage.github.io/async-storage/docs/advanced/db_size
   (Android 6 MB default cap, configurable via `AsyncStorage_db_size_in_MB`).
2. AsyncStorage Next/SQLite backend work (SQLite-KMP):
   https://github.com/react-native-async-storage/sqlite-storage-kmp and the v3 beta
   discussion thread.
3. react-native-mmkv (Marc Rousavy) — features, "~30x faster", encryption, hooks:
   https://github.com/mrousavy/react-native-mmkv
4. Tencent/MMKV (upstream engine) — mmap + protobuf design:
   https://github.com/Tencent/MMKV
5. Independent 2026 benchmarks: mrousavy/StorageBenchmark; "React Native MMKV vs
   AsyncStorage: 30x Faster Storage with Nitro Modules" (React Native Relay, 2026);
   Netguru "MMKV React Native storage: Setup, hooks & benchmarks" (Aug 2026);
   HeartIT "React Native JSI Deep Dive" (2026). Note the contrarian
   mrousavy/mmkv-vs-async_storage result for large state trees.
6. Expo SQLite SDK docs — sync (`openDatabaseSync`) and async (`openDatabaseAsync`)
   APIs, SQLCipher, change listeners:
   https://docs.expo.dev/versions/latest/sdk/sqlite/
7. Drizzle ORM — Expo SQLite driver, migrations, useLiveQuery, useMigrations:
   https://orm.drizzle.team/docs/sqlite/connect-expo-sqlite
8. Drizzle + expo-sqlite open issue #5240 — synchronous execution blocks the JS
   thread (2026): https://github.com/drizzle-team/drizzle-orm/issues/5240
9. Drizzle Expo Studio plugin:
   https://github.com/drizzle-team/drizzle-studio-expo
10. Harvi repo — `artifacts/mobile/src/shared/services/offlineQueue.ts`,
    `docs/STATE_MANAGEMENT.md`, and the services listed in §12.1.

---

*End of document. Written as an educational reference; the numbers above are
workload- and device-dependent — always benchmark against Harvi's real payloads on
its real target devices before and after a migration.*