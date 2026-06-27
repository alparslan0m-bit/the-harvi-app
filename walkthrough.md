# Walkthrough — Native IAP & Access Codes System

I have successfully replaced the Stripe-based payment setup with a native **In-App Purchase (IAP)** system integrated with **RevenueCat** and a secure **Access Code** redemption engine for physical distribution (bookshops).

All TypeScript compilation checks are passing cleanly.

## Changes Made

### 1. Database & Schema
- **[NEW] [20260627000001_access_codes.sql](file:///c:/Users/METRO/harvi%20gamed/supabase/migrations/20260627000001_access_codes.sql)**:
  - Created `access_codes` table to hold unique alphanumeric codes that map to modules or subjects.
  - Implemented the `redeem_access_code(p_code)` RPC with row locking to protect against race conditions. When redeemed, this inserts an active item into the unified `purchases` table.
  - Implemented `admin_generate_codes(target_type, target_id, count, expires_days)` to let administrators batch-generate codes.
  - Added indexes for performance and RLS policies guarding access codes.
  - Added native transaction ID columns to the existing `purchases` table.

### 2. Edge Functions
- **[NEW] [record-iap/index.ts](file:///c:/Users/METRO/harvi%20gamed/supabase/functions/record-iap/index.ts)**:
  - Implemented a clean, idempotent endpoint to record successful IAPs from the client into the database.
- **[DELETED] `create-checkout` & `verify-purchase`**:
  - Removed these obsolete, Stripe-dependent edge functions to eliminate redundant code and reduce security surface area.

### 3. Mobile Client
- **[MODIFY] [package.json](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/package.json)**: Added `react-native-purchases` for RevenueCat integration.
- **[MODIFY] [app.json](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/app.json)**: Configured production bundle identifiers `com.harvi.app` for both iOS and Android and registered the `react-native-purchases` native library plugin.
- **[NEW] [PurchaseContext.tsx](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/context/PurchaseContext.tsx)**: Manages RevenueCat SDK initialization, user mapping, IAP flows, specific module restoration, and offline access code validation.
- **[MODIFY] [usePurchase.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/usePurchase.ts)**: Simplified hook to bridge the context API with the screen state machine, exposing restore, buy, and redeem methods.
- **[MODIFY] [purchase/[moduleId].tsx](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/app/purchase/%5BmoduleId%5D.tsx)**: Completely redesigned the purchase screen into a clean 2-tab view:
  - **Buy Tab**: Uses the native IAP system via offerings loaded dynamically from App Store / Google Play, featuring a compliant **Restore Purchases** option.
  - **Access Code Tab**: Allows students to input codes bought from bookshops.
- **[MODIFY] [_layout.tsx](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/app/_layout.tsx)**: Wrapped the app tree with `PurchaseProvider`.
- **[MODIFY] [useMyPurchases.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useMyPurchases.ts)**: Added `subject_id` to query selection list to support fetching subject-level purchases alongside module-level ones.
- **[MODIFY] [useHierarchy.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/hooks/useHierarchy.ts)**: Exposed `external_price_id` (store product ID) mapping to Module and Subject trees.
- **[MODIFY] [types/index.ts](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/types/index.ts)**: Declared `external_price_id` on the typed data contracts.
- **[MODIFY] [app/(tabs)/(learn)/module/[id].tsx](file:///c:/Users/METRO/harvi%20gamed/artifacts/mobile/app/%28tabs%29/%28learn%29/module/%5Bid%5D.tsx)**: Passed the mapped `external_price_id` as the product identifier param to the purchase modal route.

---

## Testing & Verification

### Compilation Check
Ran type checking on all workspace packages:
```bash
pnpm run typecheck
```
- **Result**: `artifacts/mobile typecheck: Done` and `scripts typecheck: Done`. No compilation errors exist.

### Steps to Run Staging/Production
1. **Apply Migration**: Run the SQL script in your Supabase DB or run `supabase db push`.
2. **Setup RevenueCat**: Create products in App Store Connect / Play Console. Add them to offerings in the RevenueCat dashboard. Set `EXPO_PUBLIC_REVENUECAT_IOS_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
3. **Generate Codes**:
   ```sql
   -- Run from Supabase SQL Editor to generate 50 codes for a module
   SELECT public.admin_generate_codes('module', 'MODULE_UUID_HERE', 50, 365);
   ```
