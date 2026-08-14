# Contributing to Harvi

First off, thank you for considering contributing to Harvi! This guide provides an overview of how you can get started, our architecture standards, and best practices for developing within our ecosystem.

## 🏗️ Project Architecture Overview

Harvi is an **offline-first** React Native application built with Expo. We use a `pnpm` monorepo structure.

### Workspaces

- `artifacts/mobile/`: The main Expo React Native application. This is where all the UI and app logic lives.
- `scripts/`: Internal tools, governance scripts, and automation.
- `docs/`: Auto-generated documentation systems.

### Core Technologies

- **UI Framework**: React Native + Expo Router
- **State Management**: Zustand (local state & caching)
- **Data Fetching**: TanStack Query (React Query)
- **Backend Service**: Supabase
- **Monetization**: RevenueCat

## 💻 Local Development Setup

### 1. Prerequisites

- Node.js (v20+ recommended)
- `pnpm` (required, we enforce strict `pnpm` usage)
- Xcode (for iOS development on macOS) or Android Studio (for Android development)
- Expo CLI

### 2. Environment Variables

You will need to set up your `.env` variables to connect to Supabase and RevenueCat. 
Copy the example environment file inside `artifacts/mobile/` (if available) and fill in the necessary keys:

```bash
cd artifacts/mobile
cp .env.example .env
```

*Ask a team member for the development sandbox keys if you do not have them.*

### 3. Installing Dependencies

From the root directory, install all workspace dependencies:

```bash
pnpm install
```

### 4. Running the App

To start the Expo development server:

```bash
cd artifacts/mobile
pnpm dev
```

## 🧠 State Management & Offline-First Strategy

Harvi is designed to work seamlessly offline. When contributing to data fetching or state, adhere to these principles:

1. **Short-Circuit on Network**: Always use the `NetInfo` module to check for connectivity before making direct Supabase calls. 
2. **Three-Tier Caching**:
   - **In-Memory** (Zustand/Variables): Instant access for active sessions.
   - **Persistent** (AsyncStorage): Offline persistence across app restarts.
   - **Remote** (Supabase): Ground truth.
3. **Optimistic Updates**: When a user takes an action (e.g., completes a quiz), optimistically update the local cache/UI instantly and queue the mutation in the `offline_queue`.
4. **React Query**: Use `React Query` for managing remote state, with an `offlineFirst` network mode.

*Reference the `ARCHITECTURE.md` file for a deeper dive into the specific cache layers.*

## 📏 Coding Standards

### TypeScript

- We use strict TypeScript. **Do not use `any`**.
- Define your Zod schemas and infer types whenever validating API responses or queue payloads.
- Run `pnpm run typecheck` before committing to ensure there are no compilation errors.

### React Native / UI

- **Functional Components**: Use functional components with hooks.
- **Expo Router**: Use Expo Router for navigation instead of manually managing React Navigation stacks.
- **Haptic Feedback**: We use `expo-haptics` for meaningful interactions (e.g., selecting quiz options).
- **Animations**: Use `react-native-reanimated` for smooth, 60fps animations. Avoid JS-driven animations (`Animated.timing`) for complex interactions.

### Governance

Our repository has a `graphing` and `scripts` system that tracks the architecture. When you add new services or features, the architecture graph will automatically update. Ensure your files are named clearly (`*_service.ts`, `*_store.ts`, `*_feature.tsx`) to aid this discovery.

## 🚀 Submitting Changes

1. **Branch Naming**: Use descriptive branch names (e.g., `feature/offline-queue-retry`, `fix/login-crash`).
2. **Commit Messages**: Write clear, concise commit messages.
3. **Type Checking**: Ensure `pnpm run typecheck` passes without errors.
4. **Pull Requests**: Open a PR with a description of the changes, any screenshots for UI modifications, and link to the relevant issue.

## 🐞 Bug Reports & Feature Requests

If you encounter bugs or have feature ideas, please open an issue with a clear description and reproduction steps.
