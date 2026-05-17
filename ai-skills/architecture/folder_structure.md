# Folder Structure & Barrel Export Philosophy

This document defines the absolute directory standards, path aliases, and importing strategies for the Harvi workspace. Maintaining this structure is essential for clean code boundaries, modular screen design, and easy feature addition.

---

## 1. Monorepo Organization

Harvi is managed inside a multi-package `pnpm` monorepo. This allows shared types, scripts, database migration configurations, and multiple frontends to co-exist cleanly.

```
/
├── .vscode/               # Workspace specific VS Code settings
├── ai-skills/             # Reusable AI skill blueprints & factory templates
├── artifacts/             # Project deliverables, reports, and mobile app code
│   └── mobile/            # Core Expo React Native application package
├── supabase/              # Supabase backend configurations
│   ├── migrations/        # SQL DB Schema migrations
│   └── functions/         # Edge Functions (Stripe payments, verify checkout)
├── package.json           # Root package workspace scripts
├── pnpm-workspace.yaml    # Workspace definition & catalog versions definition
├── pnpm-lock.yaml         # Monorepo lockfile
└── tsconfig.base.json     # Base global TypeScript configurations
```

---

## 2. Mobile App Package Directory

Inside `artifacts/mobile/`, the project strictly separates state, presentation, utilities, routing, and configurations:

```
artifacts/mobile/
├── app/                  # Expo Router directory (File-based routing)
│   ├── (tabs)/           # Tab-based screen layout and tabs routes
│   │   ├── (learn)/      # Gated learning stack
│   │   ├── stats.tsx     # Dashboard & mastery metrics screen
│   │   ├── profile.tsx   # User profile overview
│   │   └── _layout.tsx   # Glassmorphic frosted bottom tab bar layout
│   ├── auth/             # Social auth callbacks and deep-link redirect targets
│   ├── purchase/         # Gated billing & Stripe redirection checkouts
│   ├── quiz/             # Bouncy spring-loaded active quiz routes
│   ├── _layout.tsx       # Root layout provider mapping (ErrorBoundary, Providers)
│   └── +not-found.tsx    # 404 Screen fallback
│
├── components/           # Extracted UI presentation components
│   ├── learn/            # Specific learning cards and module access layers
│   ├── profile/          # Profile details & history logs lists
│   ├── quiz/             # Render blocks (QuizProgress, OptionButton, ResultsView)
│   ├── ui/               # Core design elements (ErrorBoundary, OfflineBanner)
│   └── index.ts          # Root component barrel exporter
│
├── constants/            # Design system primitives, colors, and storage keys
│   ├── colors.ts         # Light, Dark, Pink theme colors definitions
│   └── storage.ts        # Global AsyncStorage constants keys
│
├── context/              # Core global React Context providers
│   ├── AuthContext.tsx   # User session, JWT updates, Google OAuth session flows
│   ├── SyncContext.tsx   # Sync session queue trigger adapter
│   └── ThemeContext.tsx  # AsyncStorage system scheme mapping
│
├── hooks/                # Stateful custom hooks containing pure logic
│   ├── useColors.ts      # Active layout palette selector
│   ├── useQuizSession.ts # Active quiz logic controller (Shuffles, score calculations)
│   ├── useSyncSession.ts # NetInfo listener & Postgres poison pill drop logic
│   └── useStats.ts       # Mastery and weekly activity aggregators
│
├── lib/                  # Deep third-party modules wrappers
│   ├── crypto.ts         # XOR cipher unicode base64 encoders
│   ├── offlineQueue.ts   # Pending AsyncStorage mutations queue
│   ├── questionCache.ts  # Question downloads snapshot manager
│   └── supabase.ts       # Large-token chunking SecureStore adapter
│
├── types/                # Strict TypeScript declaration interfaces
├── utils/                # Pure stateless helper functions (formatters)
│
├── tsconfig.json         # Paths and compiler parameters
├── app.json              # Expo application credentials
└── metro.config.js       # Metro packager asset resolver configuration
```

---

## 3. Path Aliasing Configuration

To prevent ugly nested imports (e.g. `import { useColors } from "../../../hooks/useColors"`), absolute path aliasing is set up in `tsconfig.json`. The `@/` prefix maps directly to the root source folders.

### `tsconfig.json` Configuration
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Import Usage Standards
```typescript
// AVOID: Relative nesting paths
import { useColors } from "../../../hooks/useColors";

// USE: Absolute path aliasing
import { useColors } from "@/hooks/useColors";
```

---

## 4. Barrel Export Pattern

Folders like `components/` use the Barrel Export (`index.ts`) pattern. This keeps client code imports extremely clean and reduces import boilerplate.

### Component Barrel File (`components/index.ts`)
```typescript
// UI Components
export * from "./ui/ErrorBoundary";
export * from "./ui/ErrorFallback";
export * from "./ui/OfflineBanner";
export * from "./ui/OptionButton";

// Quiz Screen Components
export * from "./quiz/QuizLoadingScreen";
export * from "./quiz/QuizErrorScreen";
export * from "./quiz/ResultsView";
export * from "./quiz/QuizQuestionContent";
```

### Client Import Statement
```typescript
// Single consolidated import
import { 
  ErrorBoundary, 
  OfflineBanner, 
  OptionButton, 
  ResultsView 
} from "@/components";
```

---

## 5. Architectural Conventions & Rules

1.  **Strict Hook Separation**: A component folder is strictly for visual presentation (JSX and Styles). If a screen needs state, API calls, or animation values, they must be extracted into a dedicated hook in `hooks/` and passed as properties.
2.  **No Direct Lib Invocations**: Libraries like `AsyncStorage`, `SecureStore`, `NetInfo` or the `supabase` client should never be directly imported by components. Components must query them via `hooks/` or `lib/` modules.
3.  **Clean Barrel Files**: Only export stable components from a barrel file. Do not export private layout fragments or subcomponents that are only used in a single file.
