# Harvi

An offline-first educational mobile application designed to provide a robust learning experience regardless of network connectivity. Harvi features a comprehensive quiz system, subject mastery tracking, and offline data synchronization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-54-white.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React_Native-0.81-blue.svg)](https://reactnative.dev/)

## ✨ Features

- **Offline-First Architecture**: Seamlessly browse content, take quizzes, and track progress offline. Data syncs automatically in the background when connectivity is restored.
- **Hierarchical Learning Path**: Content organized intuitively by Year → Module → Subject → Lecture.
- **Active Quiz Sessions**: Engaging quizzes featuring animated progress bars, haptic feedback, and detailed result breakdowns.
- **Subject Mastery Tracking**: Visually track progress with streak cards, weekly charts, and mastery filters.
- **Authentication**: Secure email/password and Google OAuth login via Supabase.
- **In-App Purchases**: Seamless premium content unlocks powered by RevenueCat.

## 📚 Documentation

- [Architecture Overview](ARCHITECTURE.md): Comprehensive, auto-generated breakdown of the app's components, services, and state layers.
- [Architecture Charts](ARCHITECTURE_CHARTS.md): Visual mermaid diagrams mapping out dependencies.
- [Developer Guide](CONTRIBUTING.md): Onboarding guide, coding standards, and project structure details.

## 🛠️ Tech Stack

| Domain | Technology | Rationale & Usage |
| :--- | :--- | :--- |
| **Core Framework** | [Expo](https://expo.dev/) & [React Native](https://reactnative.dev/) | Chosen for rapid iteration, seamless OTA updates, and deep React ecosystem integration. |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (v5.9+) | Strictly typed for robust domain modeling and safer refactoring. |
| **Backend / BaaS** | [Supabase](https://supabase.com/) | Powers PostgreSQL database, Authentication, and Edge Functions (PostgREST used heavily). |
| **Global UI State** | [Zustand](https://github.com/pmndrs/zustand) | Lightweight, unopinionated state management for synchronous UI data and theme control. |
| **Async Server State** | [TanStack Query](https://tanstack.com/query/latest) | Manages data fetching, local caching, and optimistic UI updates prior to offline queuing. |
| **In-App Purchases** | [RevenueCat](https://www.revenuecat.com/) | Abstracts away complex App Store/Play Store subscription logic and receipt validation. |
| **Fluid Animations** | [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) | Drives complex 60fps micro-interactions and gestures by bypassing the JS bridge. |
| **Keyboard Handling**| [React Native Keyboard Controller](https://github.com/kirillzyusko/react-native-keyboard-controller) | Provides perfectly synchronous native keyboard tracking. |
| **Styling** | Tailwind CSS & NativeWind | Ensures a consistent, easily themeable design system across the entire application. |

## 🏗️ Project Structure

This project uses a `pnpm` workspace setup, organized as follows:

| Workspace | Path | Purpose |
| :--- | :--- | :--- |
| **Mobile App** | `artifacts/mobile/` | The core Expo React Native application containing all UI and client logic. |
| **Scripts** | `scripts/` | Utility scripts and deployment automation tools. |
| **Governance** | `graphing/` | Houses `verify_graph.js`, the static analysis engine that enforces architecture. |
| **Libraries** | `lib/*/` | Shared isolated packages and native integrations. |
| **Documentation** | `docs/` | Static markdown files, ADRs, and API references. |

<br />

### High-Level Architecture Flow

```mermaid
graph TD
    Client[Mobile App (Expo)] -->|React Query| Cache[(AsyncStorage Cache)]
    Client -->|Mutations| Queue[Offline Sync Queue]
    Queue -.->|Background Sync| Supabase[(Supabase PostgreSQL)]
    Client -->|Auth & Live Sync| Supabase
    Client -->|Purchases| RC[RevenueCat]
```

## 🧪 Development

### Setup

Ensure you have your environment variables set up. You will need Supabase and RevenueCat API keys in your `.env` file within `artifacts/mobile` to fully test authentication and purchases.

### Type Checking

To verify TypeScript compilation across all workspaces:

```bash
pnpm run typecheck
```

## 🤝 Contributing

Please refer to the [CONTRIBUTING.md](CONTRIBUTING.md) file for detailed guidelines on how to set up your environment, our coding standards, and how to submit pull requests.

## 📄 License

This project is licensed under the MIT License.
