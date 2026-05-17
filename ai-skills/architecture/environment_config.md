# Environment Configuration & Variable Loading

This document details the environment configuration pattern of the Harvi application. It explains how dynamic client-side keys and secure backend credentials are isolated, loaded, and guarded against leaks in a React Native Expo environment.

---

## 1. Expo Client Environment Keys

In Expo SDK 49+, environment variables that need to be made available in the JavaScript bundle must be prefixed with `EXPO_PUBLIC_`. Variables without this prefix will remain completely hidden during compile time, serving as a powerful layer of security against key leaks.

### Standard Configuration Example (`.env`)
```bash
# Client endpoints (Safe to expose in the public JS bundle)
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here
```

### Accessing Variables in the Codebase
Client variables are accessed via `process.env`. They are resolved at build-time (or dynamically during local dev runs):

```typescript
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing client environment parameters. Check your .env file.");
}
```

---

## 2. Secure Backend Environment Secrets

Credentials like the Stripe Secret Key, webhook signatures, or master admin keys **MUST NEVER** carry the `EXPO_PUBLIC_` prefix. Storing them in the client bundle exposes them to reverse engineering, which will result in theft of payment processing endpoints or database compromises.

### Supabase Edge Functions Secrets
These sensitive parameters are kept exclusively on Supabase's secure server environment. They are loaded in Edge Functions via Deno's standard system reader:

```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.168/http/server.ts";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");

serve(async (req) => {
  if (!STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Missing billing key configuration" }), { status: 500 });
  }
  // Stripe connection flows...
});
```

---

## 3. Configuration Security Protocols

AI generators and engineers must follow these strict security protocols when working with configuration files:

1.  **Strict `.gitignore` Inclusions**: The `.env` file containing local credentials must always reside inside `.gitignore` files to prevent accidental commits to remote git repositories.
2.  **Explicit Typings**: Define environment typing schemas inside `expo-env.d.ts` to get full IDE autocomplete and type-safety warnings:
    ```typescript
    /// <reference types="expo-router/types" />
    
    interface ProcessEnv {
      readonly EXPO_PUBLIC_SUPABASE_URL: string;
      readonly EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    }
    ```
3.  **Client-Side Leak Prevention**: If you need to access a third-party service (e.g. Stripe checkout, OpenAI, deep-link authentication services), never write their secret keys inside client files. Instead, create a lightweight, authenticated gateway wrapper inside `supabase/functions` and invoke it via:
    ```typescript
    await supabase.functions.invoke("your-gateway-route", { body: { ... } });
    ```
