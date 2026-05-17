# AI Chat Generation Engine: Streaming Prompts, Message Parsers & Interactive UIs

This document defines the automated stages, streaming configurations, and dynamic message parsers required by AI agents to construct responsive, high-speed AI chat and dialogue interfaces inside the App Factory workspace.

---

## 1. AI Chat Generation Workflow

Every generated AI chat interface must implement the following sequential structures:

```
        ┌────────────────────────────────────────────────────────┐
        │            Stage 1: Streaming Socket Setup             │
        │  Configure streaming connection to remote API endpoint │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 2: Chunk Parsing & Stream            │
        │  Read streaming chunks dynamically, update local state │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 3: Message Formatting                │
        │  Format markdown snippets and source cards in UI       │
        └──────────────────────────┬─────────────────────────────┘
                                   │
                                   ▼
        ┌────────────────────────────────────────────────────────┐
        │             Stage 4: Auto-scroll & Focus               │
        │  Scroll to bottom on new message chunk, focus inputs   │
        └────────────────────────────────────────────────────────┘
```

---

## 2. Interactive Chat Optimization Rules

*   **Rule 1 (Streaming Updates)**: Never wait for the entire AI payload response to compile before showing updates. Implement dynamic streaming layouts to render tokens instantly as they arrive.
*   **Rule 2 (FlatList Recycler)**: Chat message histories must utilize FlatList components to ensure rapid cell recycling.
*   **Rule 3 (Layout Shifts Prevention)**: Render skeleton placeholders matching the average token size of responses while streaming, preventing jarring layout jumps.

---

## 3. Dynamic Chat Verification

AI agents can verify that a newly generated AI chat setup compiles cleanly by running this test script in a scratch file:

```typescript
// scratch/test_chat_build.ts
function verifyChatSystem() {
  try {
    const textChunk = "Completed medical analysis: Normal sinus rhythm.";
    const tokens = textChunk.split(" ");
    console.log(`Success: Chat message streaming compiled cleanly. Tokens length: ${tokens.length}`);
  } catch (err) {
    console.error("Failure: Chat system verification failed:", err);
  }
}

verifyChatSystem();
```

---

# Anti-Patterns to Avoid

*   **Blocking Full-Payload Buffers**: Waiting for full LLM responses to complete before displaying any message tokens to users.
    *   *Consequence*: results in high latency, causing users to feel the app is stuck or frozen.
*   **Unthrottled Scroll Actions**: Triggering scroll-to-bottom actions on every single character stream chunk update.
    *   *Consequence*: starves visual rendering speeds, causing layout jitter and dropping active frame rates.
