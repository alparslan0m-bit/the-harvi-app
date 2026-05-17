# API Architecture & Backend Integrations

This document defines the integration protocols between the mobile client and Supabase services. It teaches future AI agents how to execute database queries safely, run database RPC functions, invoke serverless Edge Functions, and manage integration failures.

---

## 1. Client Setup & Initialisation

All backend database requests are directed through the unified Supabase JavaScript client, which is initialized with custom storage adapters for native-token persistence:

```typescript
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto"; // Critical polyfill for React Native support

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter, // Custom chunking adapter detailed in auth_system
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 2. Leveraging Database RPCs (Stored Procedures)

To optimize mobile performance and reduce database querying overhead (which consumes battery and bandwidth), complex calculations or relational joins are offloaded to **PostgreSQL Stored Procedures (RPCs)** on the server.

### Example: Probing Module Gating (`hooks/useModuleAccess.ts`)
Instead of fetching full user profiles, orders, and modules tables to compute permissions, the client triggers a single, unified database RPC `get_content_access_map` that evaluates permissions instantly on PostgreSQL:

```typescript
async function fetchContentAccess(): Promise<Map<string, ContentAccessEntry>> {
  const { data, error } = await supabase.rpc("get_content_access_map");
  
  if (error) {
    throw new Error(`Failed to query content permissions: ${error.message}`);
  }

  const map = new Map<string, ContentAccessEntry>();
  for (const row of (data ?? []) as ContentAccessEntry[]) {
    map.set(row.item_id, row);
  }
  return map;
}
```

---

## 3. Serverless Edge Functions Gateway

For transactional processes that require private API credentials (like Stripe billing or credential verifications), the client invokes serverless **Supabase Edge Functions**.

### Invocation Pattern (`hooks/usePurchase.ts`)
The client triggers Edge Functions via the `.functions.invoke()` helper. All payloads and redirects must be clearly mapped:

```typescript
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

export async function createBillingSession(moduleId: string) {
  // Generate dynamic deep-link return parameters
  const successUrl = Linking.createURL("/purchase/success");
  const cancelUrl = Linking.createURL("/purchase/cancel");

  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      module_id: moduleId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  });

  if (error || !data?.url) {
    throw new Error(error?.message ?? "Checkout creation failed");
  }

  return data.url; // Returns Stripe Checkout web URL
}
```

---

## 4. API Error Handling Standards

AI generators must enforce strict API error handling conventions:

1.  **Graceful SQL Error Recovery**: When querying columns dynamically, check for known error codes (like `42703` for non-existent columns) to fallback or skip queries safely:
    ```typescript
    const { data, error } = await supabase.from("questions").select("*");
    if (error) {
      if (error.code === "42703") {
        // Skip dynamically and try alternative candidates
        return tryAlternativeMapping();
      }
      throw error;
    }
    ```
2.  **No Leaked DB Errors to UI**: Catch API database errors and translate them into friendly, human-readable notifications. Never display raw SQL strings, constraint names, or status codes to end users.
3.  **Strict Typing for RPC Payloads**: Always cast RPC response datasets to strong TypeScript interfaces:
    ```typescript
    export interface ContentAccessEntry {
      item_id: string;
      item_type: 'module' | 'subject';
      has_access: boolean;
      is_free: boolean;
      price_cents: number;
    }
    ```
