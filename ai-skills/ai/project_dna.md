# Project DNA: How to THINK Like the Creator of Harvi

This document serves as the core ideological playbook of the Harvi engineering organization. It details the product, engineering, architectural, UX, DX, and AI collaboration philosophies that define our development standards. Any developer or autonomous AI agent working in this workspace must study and adopt this mindset.

---

## 1. Engineering Culture: Systems, Not Screens

### Core Principles
1.  **Scalability First**
    *   *Philosophy*: Every feature must support future expansion. Avoid tightly coupled logic and prefer modular, service-oriented architectures.
    *   *Implementation*: Decouple views from data sources. Write modules such that adding a new data source or provider requires modifying configuration schemas, not core rendering logic.
2.  **Reusable Systems**
    *   *Philosophy*: We build robust, generalized systems, not isolated, custom pages. Components should solve entire categories of problems.
    *   *Implementation*: A quiz engine component should not only render cardiology quizzes; it should render *any* linear, progress-tracked questionnaire (onboardings, settings workflows, assessments) by simply varying its configuration contracts.
3.  **AI-Friendly Codebase**
    *   *Philosophy*: Structure code so that autonomous AI agents can read, understand, and generate features without human intervention or compilation error.
    *   *Implementation*: Use highly predictable folder structures, explicit TypeScript interfaces, and eliminate hidden states or global side-effects. Keep component responsibilities isolated and clear.
4.  **Performance by Default**
    *   *Philosophy*: Do not optimize late; write high-performance code on the first pass. 
    *   *Implementation*: Prevent redundant layout redraws, memoize heavy component lists, compress static assets, and run CPU-intensive tasks inside `useMemo` blocks.
5.  **Fast Iteration**
    *   *Philosophy*: The codebase must be lightweight and modular to allow rapid feature shipping without regression risks.
6.  **Clean Developer Experience (DX)**
    *   *Philosophy*: A new engineer or fresh AI agent should understand the entire repository architecture, coding conventions, and deployment pipelines within 10 minutes of scanning the folders.

---

## 2. The Golden Rules of Harvi

To maintain clean architecture under rapid development pressure, all work must adhere to these absolute rules:

*   **No business logic inside UI components**: UI files must only map layouts, themes, and user interactions. State tracking and data mutations must reside inside custom React hooks.
*   **No duplicated API logic**: Access database layers and edge APIs exclusively through unified, centralized React Query hooks. Never invoke raw `fetch` or Supabase clients inside a component.
*   **No giant screens**: If a screen file exceeds 350 lines of code, it must be refactored. Modularize elements into subcomponents and export them through barrel files.
*   **No deeply nested components**: Keep the rendering tree flat. Avoid creating complex inline component trees; separate concerns into standalone components that communicate via explicit props.
*   **One responsibility per module**: A hook handles one state flow; a utility solves one programmatic problem; a component draws one UI element.
*   **Components must remain composable**: Use the `children` prop pattern to compose rich, flexible layouts rather than creating monoliths that accept 50 different configuration flags.

---

## 3. Startup & Product Strategy: Speed & Simplicity

### A. The "Code is a Liability" Mindset
Every line of code written is an active cost in terms of maintenance, testing, and debugging. Before building a feature:
1.  **Simplify Requirements**: Challenge the product scope. Can we achieve 90% of the value with 10% of the code?
2.  **Zero Speculative Coding**: Never write features, helper methods, or styling options because "we might need them in the future." Build only what is required to resolve active, defined user problems *now*.
3.  **Dependency Minimization**: Treat third-party packages as vulnerabilities. Every package added introduces supply-chain risks, bundles size expansion, and potential API breakages during future React Native upgrades. Prefer vanilla solutions using native APIs whenever possible.

### B. Speed as the Ultimate Feature
In a startup environment, speed of iteration is the only competitive advantage that matters. Our systems must be designed to build, compile, and deploy in minutes:
*   Use a unified monorepo with pnpm workspaces to share code instantly between mobile, web, and serverless backends without registry publication delays.
*   Configure automated CI/CD pipelines via EAS Build that compile native packages automatically in background runners, ensuring continuous delivery to testers and app stores.

---

## 4. User Experience (UX) Psychology: Friction & Reward

Harvi is designed to feel human, approaching, and rewarding. We use cognitive psychology to drive engagement and retention:

### A. Reducing Cognitive Friction
*   **Flicker-Free Mounts**: A user should never see empty gray boxes or shifting text elements when launching a screen. We use pre-warmed RAM memory caching and pre-fetched initial queries to render complete screens instantly on the first pass.
*   **Progress Indicators**: Long forms or complex quizzes are chunked into micro-steps accompanied by spring-loaded progress bars. Visual indicators reassure the user that the process is quick and finite.

### B. Psychological Reward Loops
To build learning habits, the application turns mundane progress events into rewarding milestones:
*   **Physical Haptic Responses**: Actions carry weight. Successes trigger dual-pulse haptic notifications; selection changes trigger light tactile ticks; errors trigger double-pulse alerts. This grounds digital actions into the user's physical world.
*   **Micro-Animations**: We use smooth spring physics on charts, scores, and buttons. When a user finishes a quiz, numbers count up quickly and active progress indicators bounce gently, releasing subtle, rewarding visual cues.
*   **Multi-Theming Warmth**: The triple-theming setup (`light`, `dark`, `pink`) respects the user's workspace context and aesthetic preferences, reducing visual fatigue.

---

## 5. Developer & AI Collaboration Philosophy

In this codebase, human engineers and autonomous AI agents work as pair programming partners. To ensure this relationship is smooth and productive, we enforce these developer guidelines:

### A. AI-Optimized Code Layouts
*   **Explicit Typings**: Avoid implicit casting or generic types (`any`). Type safety is not just a safety feature; it is the ultimate API documentation for an AI developer.
*   **Clean Separation of Concerns**: By keeping state logic inside custom hooks and visual styles at the bottom of the component file, an AI can safely modify UI designs without accidentally altering underlying database mutation paths.
*   **No Code Placeholders**: An AI must never output incomplete files containing comments like `// TODO: Implement this method`. All generated files must be fully functional, compiled, and production-ready.

### B. Surgical Modifications Rule
When working on existing code:
1.  **Do No Harm**: Identify the exact lines of code that require modification. Change only what is necessary to fulfill the goal.
2.  **Clean up your own mess**: If your refactoring renders an import statement, a variable, or a component property unused, delete it immediately.
3.  **Preserve existing documentation**: Do not wipe out or modify existing architectural comment tags or developer documentation unless explicitly instructed.
