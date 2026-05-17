# Master App Blueprint Template: Construction Workflows

This document establishes the master step-by-step construction blueprint. It teaches future developers or AI agents exactly how to build a production-ready, high-performance, offline-first React Native application from scratch using this skill library.

---

## The 5 Stages of Development

```
┌────────────────────────────────────────────────────────────────────────┐
│                        App Construction Stages                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    STAGE 1: Workspace setup (pnpm workspaces, catalogs, app.json)
    │
    STAGE 2: Backend integration (Supabase, tables, permissions, RPCs)
    │
    STAGE 3: Core App Engine (dual-layer caching, offline queues, Auth)
    │
    STAGE 4: Interface Design (themes, glassmorphic tab bars, skeletons)
    │
    STAGE 5: Deployment & Hardening (EAS native builds, Stripe hooks)
```

---

## STAGE 1: Monorepo Workspace Setup

1.  **Initialize pnpm Workspace**: Create the root folder configuration and register subfolders inside `pnpm-workspace.yaml` (see [scaling_strategy.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/scaling_strategy.md)).
2.  **Lock catalogs shared versions**:centralize shared dev packages to ensure matching React Native compile versions.
3.  **Bootstrap Expo Router app**: run `npx create-expo-app@latest` to scaffold the `mobile` app inside the workspace.
4.  **Configure path aliasing**: register `@/*` paths in `tsconfig.json` (see [folder_structure.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/folder_structure.md)).

---

## STAGE 2: Backend Database Setup

1.  **Configure Supabase migrations**: Define SQL schemas for primary tables (modules, lectures, questions, progress, stats).
2.  **Define Security Policies**: Configure Row Level Security (RLS) policies on Supabase to ensure users can only modify their own stats and progress entries.
3.  **Optimize with RPC Procedures**: Write Stored Procedures on PostgreSQL to fetch joined datasets in one call (see [api_architecture.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/api_architecture.md)).

---

## STAGE 3: Core App Engine Setup

1.  **Integrate Supabase Auth Chunking**: Register the custom `SecureStoreAdapter` to transparently bypass iOS 2KB limits (see [authentication_system.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/authentication_system.md)).
2.  **Implement Offline sync Queue**: set up `offlineQueue.ts` to capture offline database inputs (see [offline_strategy.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/offline_strategy.md)).
3.  **Wire Dual-layer caching**: set up RAM Maps and AsyncStorage pre-warming hooks to prevent loading flickers on mount (see [caching_strategy.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/caching_strategy.md)).

---

## STAGE 4: Interface Design Setup

1.  **Mount root layout providers**: Register providers in the correct wrapper order inside `app/_layout.tsx` (see [state_management.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/state_management.md)).
2.  **Configure typography & dynamic colors**: setup `useColors` hooks to handle Light/Dark/Pink dynamic styling (see [color_system.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/color_system.md)).
3.  **Build Frosted Navigation**: setup the frosted glassmorphic bottom tab bar on iOS using `BlurView` (see [navigation_patterns.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/navigation_patterns.md)).
4.  **Polish with Springs**: Add spring-loaded indicators, skeleton pulsing loaders, and count-up charts (see [animations.md](file:///c:/Users/METRO/harvi%20gamed/ai-skills/animations.md)).

---

## STAGE 5: Deployment & Hardening

1.  **Configure EAS native build packages**: Create dynamic `eas.json` profiles for Android APK outputs and iOS IPA releases.
2.  **Deploy Supabase Edge Functions**: Deploy transactions checkout handlers and payment webhooks to connect Stripe with Supabase.
3.  **Audit Security boundaries**: Ensure all API calls use SSL gates, and correctly encrypt critical user information (like quiz answers) using client-side ciphers.
