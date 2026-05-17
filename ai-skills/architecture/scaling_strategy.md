# Monorepo Scaling & Package Strategy

This document details the monorepo workspace configuration, pnpm configurations, dependency cataloging, and package security strategies of the Harvi repository. Following this strategy keeps packages clean, builds fast, and secures the development pipeline from third-party supply-chain attacks.

---

## 1. Monorepo PNPM Workspace Architecture

The workspace is structured using a `pnpm-workspace.yaml` manifest that manages independent subprojects:

```yaml
packages:
  - artifacts/*       # Contains mobile app packages and mockup sandboxes
  - lib/*             # Houses shared backend utility packages
  - lib/integrations/* # Houses external integrations (Stripe, etc.)
  - scripts           # Standalone devops automations and migrations scripts
```

### Rationale
*   **Separation of Concerns**: The developer sandboxes (`mockup-sandbox`), serverless code (`supabase/functions`), and native apps (`mobile`) remain physically separate, reducing conflicts and loading times in IDEs.
*   **Faster Dependency Linking**: `pnpm` uses a hard-linked single store (`node_modules`) on disk, which saves gigabytes of redundant installations compared to standard npm or yarn workspaces.

---

## 2. Shared Dependency Catalogs

To prevent dependency version mismatches (e.g. `react` or `typescript` versions drifting across different workspace apps), the codebase uses a centralized `catalog` in `pnpm-workspace.yaml`.

### Catalog Configuration Pattern
Shared dev dependencies and versions are locked inside the catalog:

```yaml
catalog:
  '@tailwindcss/vite': ^4.1.14
  '@tanstack/react-query': ^5.90.21
  '@types/node': ^25.3.3
  '@types/react': ^19.2.0
  # Locked to exact version for Expo Native compatibility
  react: 19.1.0
  react-dom: 19.1.0
  zod: ^3.25.76
```

### Subproject Consumption Pattern (`package.json`)
The subprojects reference these shared version locks using `catalog:` without hardcoding strings:

```json
{
  "name": "@workspace/mobile",
  "devDependencies": {
    "@tanstack/react-query": "catalog:",
    "react": "catalog:",
    "react-dom": "catalog:",
    "zod": "catalog:"
  }
}
```

---

## 3. Supply-Chain Security & Defenses

A critical part of the scaling strategy is protecting developers and builds from **Supply-Chain Dependency Injection Attacks** (malicious packages released on npm).

### Minimum Release Age Enforcements
The project enforces that any package installed in the monorepo must have been published on the public npm registry for at least **1 day (1440 minutes)**:

```yaml
minimumReleaseAge: 1440
minimumReleaseAgeExclude: []
```

### Why this is critical:
*   Most malicious packages published to npm are caught, flagged, and retracted by the security community within 6–12 hours of upload.
*   Enforcing a 1-day quarantine buffer completely mitigates zero-day dependency hijack vulnerabilities.
*   Exclusions must only be granted to trusted, high-reputation systems (e.g., `react` or `typescript` official patches) if absolutely urgent.

---

## 4. Global Dependency Overrides

In deep node hierarchies, nested dependencies may refer to older, vulnerable, or buggy sub-packages (e.g. `esbuild` or `picomatch` vulnerable versions). The workspace enforces clean, safe locks globally:

```yaml
overrides:
  # TSX is enforced for running esbuild kit safely
  "@esbuild-kit/esm-loader": "npm:tsx@^4.21.0"
  esbuild: "0.27.3"
  
  # picomatch ReDoS and Method Injection fixes (micromatch & tinyglobby patches)
  "micromatch>picomatch": "^2.3.2"
  "tinyglobby>picomatch": "^4.0.4"
  "@expo/metro-config>picomatch": "^4.0.4"
  
  # DoS and Prototype Pollution overrides
  "path-to-regexp": "^8.4.2"
  "lodash": "^4.18.1"
  "yaml": "^2.8.3"
```

---

## 5. Guidelines for Future Subprojects

When generating or extending packages:
1.  **Always use pnpm**: Never use `npm install` or `yarn add` in subdirectories. This will break the hard-linked global store and create multiple conflicting lockfiles.
2.  **Inherit Catalogs**: Always reference `catalog:` in `dependencies` for React, TypeScript, React Query, and Tailwind.
3.  **Strict Peer Dependency Rules**: Set `autoInstallPeers: false` to force structural correctness and avoid duplicate bundle outputs.
