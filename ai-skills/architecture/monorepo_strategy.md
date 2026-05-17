# Monorepo Strategy: Multi-Platform Scaling & Shared Workspaces

This document defines the monorepo architecture, shared workspace configurations, and atomic dependency standards of the App Factory workspace.

---

## 1. Advanced Architectural Reasoning & Workspaces

As a startup or enterprise grows, building separate repositories for the Mobile Client, Web Admin Panel, and API Server introduces critical sync lag. Schema changes on the database require manually updating and publishing multiple npm packages.

To achieve **zero-lag deployment synchronization**, the workspace is structured as a single monorepo utilizing **pnpm workspaces**:

```
/ (Monorepo Root)
├── pnpm-workspace.yaml          # Defines shared package subdirectories
├── package.json                 # Root configurations and globally shared tools
├── packages/                    # Internal shared modules & packages
│   ├── database/                # Database models, schemas, and Supabase client
│   ├── design-system/           # Shared design tokens, styles, and configurations
│   └── ui-common/               # Shared react components (web/native overlays)
└── apps/                        # Platform deployments
    ├── mobile/                  # Expo React Native mobile client
    ├── admin/                   # Next.js web application for subject metrics
    └── api/                     # Serverless edge function services
```

---

## 2. Reusable Infrastructure & Workspace Configuration

The monorepo configuration enforces absolute dependency synchronization and local path mapping.

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### packages/database/package.json
```json
{
  "name": "@harvi/database",
  "version": "1.0.0",
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.105.1"
  }
}
```

### Reference: Mapping Internal Dependencies inside `apps/mobile/package.json`
```json
{
  "name": "mobile",
  "version": "1.0.0",
  "dependencies": {
    "react-native": "0.76.7",
    "@harvi/database": "workspace:*"  // Links locally without package publishing
  }
}
```

---

## 3. Real-World Scaling: Dependency Catalogs

In a standard monorepo, different apps often end up using different versions of the same package (e.g. `react` or `typescript`), causing silent runtime conflicts. 

Harvi prevents this by implementing **pnpm catalogs**, defining shared dependency versions in the root `pnpm-workspace.yaml` and referencing them globally:

```yaml
# Root pnpm-workspace.yaml
catalog:
  react: "19.1.0"
  typescript: "5.3.3"
  expo: "~54.0.27"
```

Then in `apps/mobile/package.json`:
```json
{
  "dependencies": {
    "react": "catalog:",
    "expo": "catalog:"
  }
}
```

---

## 4. AI Guidance & Selection Heuristics

Future AI agents must utilize the following decision tree when creating or scaling packages:

```
                  ┌──────────────────────────────┐
                  │   Adding New Functionality   │
                  └──────────────┬───────────────┘
                                 │
                 Is it platform-specific (e.g., Apple Haptics)?
                 ├── Yes ──► Create in apps/mobile/
                 │
                 └── No  ──► Does it interact with database tables?
                             ├── Yes ──► Add to packages/database/
                             │
                             └── No  ──► Does it map branding color tokens?
                                         ├── Yes ──► packages/design-system/
                                         └── No  ──► apps/shared-utils/
```

---

# Anti-Patterns

*   **Direct Path File Imports (`../../packages`)**: Never import files by escaping an application directory using direct folder traversal. This breaks bundler dependency caching, increases compile times, and prevents testing packages in isolation.
    *   *Consequence*: Metro will crash during packaging, throwing circular reference warnings.
*   **Duplicate Root Installation**: Installing packages directly inside sub-apps that are already managed globally by the monorepo root.
    *   *Consequence*: Bundle sizes balloon as Webpack/Metro include two different versions of the same library, introducing weird state-sharing bugs.
*   **Phantoms Dependencies**: Utilizing a package inside an internal workspace (e.g. `@harvi/database`) without explicitly declaring it inside its local `package.json` file.
    *   *Consequence*: Local unit tests will pass in development because the root module contains the package, but will crash instantly in isolation during production CI/CD builds.
