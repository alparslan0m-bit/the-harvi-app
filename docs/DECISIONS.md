# Architectural Decisions Record (ADR)

This document tracks the major architectural decisions and trade-offs made during the development of Harvi.

## 1. Offline-First Architecture

- **Context**: Harvi is an educational application. Users often study while commuting, in schools with poor Wi-Fi, or in areas with limited connectivity. Relying on a constant internet connection would severely degrade the learning experience.
- **Decision**: Adopt a strict offline-first architecture for all core learning flows (browsing hierarchy, taking quizzes, viewing stats).
- **Rationale**: Ensures uninterrupted access to content.
- **Trade-offs**: Introduces significant complexity in state management. We must maintain a robust offline mutation queue and implement a three-tier caching system (Zustand → AsyncStorage → Supabase) to resolve conflicts and sync data when the network is restored.

## 2. Monorepo Structure (`pnpm` Workspaces)

- **Context**: The project involves a React Native mobile app, custom scripts, and shared libraries that might evolve into web or backend packages in the future.
- **Decision**: Use a `pnpm` workspace monorepo.
- **Rationale**: `pnpm` offers fast, deterministic installs and strict dependency isolation (preventing phantom dependencies). Workspaces allow us to easily separate `artifacts/mobile` from our `scripts` and shared `lib/` code.
- **Trade-offs**: Slightly steeper learning curve for developers unfamiliar with monorepos, and tooling (like React Native Metro bundler) requires specific configuration (`metro.config.js` watch folders) to resolve workspace packages.

## 3. State Management: Zustand + TanStack Query

- **Context**: Managing local UI state (like theme or session) alongside remote server state (like progress and quiz questions) can become chaotic if merged into a single state management library like Redux.
- **Decision**: Use `Zustand` exclusively for global, synchronous client state. Use `TanStack React Query` exclusively for asynchronous server state and caching.
- **Rationale**: React Query handles complex challenges like cache invalidation, background refetching, and `offlineFirst` retry logic out-of-the-box. Zustand provides a minimal, boilerplate-free API for simple UI state.
- **Trade-offs**: Developers must understand the boundary between the two libraries and know when to use which (e.g., storing a user's chosen theme in Zustand, but storing their stats in React Query).

## 4. Supabase as Backend-as-a-Service (BaaS)

- **Context**: Building a custom backend for authentication, database, and edge functions requires significant time and maintenance overhead.
- **Decision**: Use Supabase for PostgreSQL database, Authentication (Email + Google OAuth), and Edge Functions.
- **Rationale**: Supabase provides a scalable, open-source Postgres foundation with instant APIs. The tight integration with React Native makes auth flow implementation seamless.
- **Trade-offs**: Ties the application relatively tightly to the Supabase client SDK and limits some complex custom backend logic to Edge Functions (Deno).

## 5. Chunked Secure Storage for Sessions

- **Context**: iOS SecureStore has a strict 2KB limit per key. Supabase JWT session tokens (especially with OAuth providers) frequently exceed this limit, causing authentication failures.
- **Decision**: Implement a custom `SecureStoreAdapter` that chunks the Supabase session payload into 1800-byte segments before storing them in Expo SecureStore.
- **Rationale**: Bypasses the iOS limitation without sacrificing security, ensuring reliable session persistence.
- **Trade-offs**: Adds a layer of complexity to the authentication initialization flow.

## 6. React Native Reanimated over standard Animated

- **Context**: Educational apps require engaging, fluid UI (progress bars, haptic feedback interactions, transitions) to feel high-quality and retain users.
- **Decision**: Use `react-native-reanimated` for all complex animations.
- **Rationale**: Reanimated runs animations natively on the UI thread, bypassing the React Native JavaScript bridge. This guarantees smooth 60fps (or 120fps) performance even when the JS thread is busy processing quiz logic.
- **Trade-offs**: Reanimated's worklet concept has a steeper learning curve compared to React Native's built-in `Animated` API.

## 7. Automated Architectural Governance

- **Context**: As the app scales, architectural drift occurs. Services become entangled, and it becomes hard to track the flow of data.
- **Decision**: Implement a custom graphing tool (`verify_graph.js`) that statically analyzes the codebase and auto-generates the `ARCHITECTURE.md` file.
- **Rationale**: Guarantees that the architectural documentation is always 100% accurate and reflects the literal code structure, not just the intended design.
- **Trade-offs**: The graphing tool itself must be maintained alongside the application.

## 8. Expo Router for Navigation

- **Context**: Managing deep links and navigation state across complex tabs and modals can become brittle with traditional programmatic navigation.
- **Decision**: Adopt `Expo Router` for file-based routing.
- **Rationale**: Provides Next.js-style file-based routing, automatic deep linking setup, and cleaner component trees without massive navigation provider wrappers.
- **Trade-offs**: Less fine-grained programmatic control over navigation stacks compared to raw React Navigation. File structures dictate URL structures, which can sometimes enforce rigid folder architectures.

## 9. RevenueCat for Monetization

- **Context**: Handling cross-platform subscriptions, receipt validation, and access revocation natively via StoreKit and Google Play Billing is notoriously difficult and error-prone.
- **Decision**: Integrate `RevenueCat` (`react-native-purchases`) to manage all In-App Purchases.
- **Rationale**: Provides a unified API for both iOS and Android, handles receipt validation server-side securely, and integrates cleanly with our Supabase edge functions to grant content access.
- **Trade-offs**: Introduces a third-party dependency for a critical revenue path.

## 10. Zod for Schema Validation

- **Context**: When reading payloads from the offline queue (`AsyncStorage`) to send to Supabase, corrupted data can cause catastrophic sync failures that block the entire queue.
- **Decision**: Enforce strict runtime schema validation using `Zod` (e.g., `PendingQuizResultSchema`).
- **Rationale**: Guarantees that malformed mutations never enter the queue, and ensures type safety bridges the gap between local storage and remote APIs.
- **Trade-offs**: Slight increase in bundle size and minimal runtime parsing overhead.

## 11. Exponential Backoff for Offline Sync

- **Context**: When a user is in an area with a flaky connection (e.g., a train), the `NetInfo` listener might rapidly toggle between online and offline, causing the `syncStore` to spam Supabase with requests.
- **Decision**: Implement a 10-second timeout and a 30-second exponential backoff for the offline queue `flush()` method.
- **Rationale**: Respects device battery life, prevents API rate limiting from Supabase, and ensures that syncs only occur when the connection is genuinely stable.
- **Trade-offs**: A user might regain connectivity, but their stats won't sync for up to 30 seconds if they just came off a failed attempt.

## 12. Custom Floating Tab Bar

- **Context**: Harvi's visual identity leans towards modern, rounded, and friendly educational interfaces rather than strictly native corporate UI.
- **Decision**: Implement a custom floating, pill-shaped tab bar instead of the default native iOS/Android bottom navigation bars.
- **Rationale**: Creates a distinctive brand identity and allows for custom active-tab micro-animations.
- **Trade-offs**: Diverges from standard Apple Human Interface Guidelines and Material Design defaults. Requires custom safe-area handling to avoid overlapping with newer home indicators.

## 13. Sequential Locking for Offline Queue (`queueLock`)

- **Context**: The offline queue relies on `AsyncStorage`, which is asynchronous. If a user completes multiple actions rapidly (or background sync fires concurrently with a user action), race conditions could occur where one array write overwrites another, resulting in lost quiz data.
- **Decision**: Implement a strict sequential promise chain lock (`withQueueLock`) in `offlineQueue.ts`.
- **Rationale**: Guarantees that all reads and writes to the `harvi:quiz_queue` occur sequentially, entirely eliminating the risk of concurrent array mutations.
- **Trade-offs**: Minor performance overhead when enqueuing mutations, as promises must resolve in order.

## 14. Single-Request Relational Hierarchy Fetching

- **Context**: Loading the Year → Module → Subject → Lecture tree involves querying four separate relational layers. Doing this sequentially would cause immense waterfall loading delays.
- **Decision**: Leverage Supabase's PostgREST foreign key embedding auto-detection.
- **Rationale**: The `hierarchyService` fetches the entire nested object graph in a single HTTP request. This dramatically reduces Time to Interactive (TTI) and makes caching the entire structure to `AsyncStorage` much simpler.
- **Trade-offs**: The single payload can become large if the curriculum scales massively, potentially requiring pagination or lazy-loading sub-trees in the future.

## 15. Optimistic Updates Preceding Queueing

- **Context**: When a user completes a task, waiting for the offline queue to persist the result before updating the UI introduces noticeable latency.
- **Decision**: The `progressService` and `bestScoreService` mutate the TanStack React Query cache *optimistically*, instantly updating the UI, *before* passing the payload to the offline queue.
- **Rationale**: Creates a perception of zero latency for the user.
- **Trade-offs**: If the `AsyncStorage` write fails (e.g., storage full), the UI will show a completed state that is eventually lost. We mitigate this with automatic retry logic in `offlineQueue.ts`.

## 16. Feature-Based Architecture

- **Context**: Organizing a growing codebase purely by layer (e.g., all components in one folder, all services in another) makes it difficult to understand the boundaries of a specific product feature.
- **Decision**: Adopt a feature-based architecture under `src/features/*`, grouping UI, services, and local state by domain (e.g., `auth`, `learn`, `quiz`, `stats`, `purchase`).
- **Rationale**: Increases modularity and maintainability. A developer working on the quiz feature has all relevant logic co-located. Logic that spans multiple features is strictly placed in `src/shared/*`.
- **Trade-offs**: Determining whether a piece of logic is "shared" or belongs solely to a "feature" can sometimes be ambiguous, requiring strict governance.

## 17. React Native (Expo) over Flutter

- **Context**: Selecting the primary cross-platform mobile framework for the application.
- **Decision**: Use React Native via the Expo framework rather than Flutter.
- **Rationale**: Leverages existing React ecosystem expertise and allows the use of powerful, mature libraries like TanStack Query and Zustand. Furthermore, Expo provides unparalleled Over-The-Air (OTA) update capabilities and significantly simplifies native module management via continuous native generation.
- **Trade-offs**: Flutter typically offers more predictable rendering performance for highly custom canvases. React Native requires careful performance management (e.g., using Reanimated) to bypass the JavaScript bridge for complex 60fps animations.
