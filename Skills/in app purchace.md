---
name: stripe-to-iap-migration
description: >
  Use this skill when tasked with removing Stripe payment integration and replacing it
  with native mobile in-app purchases (IAP) via Google Play Billing and Apple StoreKit.
  Triggers include: 'remove Stripe', 'migrate to IAP', 'Google Play payments',
  'Apple in-app purchase', 'StoreKit', 'Play Billing', 'replace payment provider',
  or any request to shift billing responsibility to the app stores. Covers full-stack
  changes: removing Stripe SDKs, wiring up platform IAP SDKs, updating backend
  receipt/subscription verification, and adapting the database/entitlement model.
  Do NOT use for web-only apps (stores forbid web IAP bypass), or when Stripe must
  remain for non-mobile surfaces (hybrid — keep Stripe for web, add IAP for mobile).
---

# Stripe → Google Play & Apple IAP Migration

## Why This Migration Exists

Apple and Google **mandate** that digital goods sold inside iOS/Android apps use their
native billing systems (App Store Review Guideline 3.1.1 / Google Play Billing Policy).
Stripe (or any third-party processor) is prohibited for in-app digital purchases. Physical
goods and services consumed outside the app are exempt.

---

## Architecture Overview

```
BEFORE                                  AFTER
──────                                  ─────
Client  ──► Stripe.js / SDK             Client  ──► StoreKit 2 (iOS)
         ──► Your backend               Client  ──► Play Billing Library (Android)
         ──► Stripe webhooks            Both    ──► Store server (receipt authority)
                                        Store   ──► Your backend (server-to-server
                                                     notifications / verification)
```

**Key mental shift:** The stores become the source of truth for purchase state.
Your backend **verifies** receipts/tokens; it no longer initiates charges.

---

## Step 1 — Audit & Classify Products

Before touching code, categorise every Stripe product/price:

| Stripe object         | IAP equivalent                          | Notes                            |
|-----------------------|-----------------------------------------|----------------------------------|
| `price` one-time      | Non-consumable / consumable IAP         | Consumables can be re-purchased  |
| `price` recurring     | Auto-renewable subscription             | Both stores support              |
| `coupon` / `discount` | Introductory price / offer code         | Configured in store dashboards   |
| `customer` object     | Store account (opaque to you)           | Map via your own user table      |
| `PaymentIntent`       | Eliminated — store handles payment UI   |                                  |

```bash
# Export all active Stripe prices for mapping
stripe prices list --limit 100 -o json > stripe_prices.json
```

---

## Step 2 — Configure Store Products

### Apple App Store Connect

1. Go to **App Store Connect → My Apps → [App] → In-App Purchases**.
2. Create products matching your Stripe price catalogue.
3. Set `productIdentifier` values — recommend namespaced reverse-DNS:
   `com.yourapp.subscription.monthly`, `com.yourapp.premium.lifetime`
4. For subscriptions: create a **Subscription Group**, add all durations.
5. Enable **App Store Server Notifications V2** (production + sandbox):
   - URL: `https://api.yourbackend.com/webhooks/apple`
   - Notification type: `transactionInfo` (JWT-signed)
6. Generate a **shared secret** (for receipt validation fallback).
7. Download your **Apple Root Certificates** for local JWT verification.

### Google Play Console

1. Go to **Play Console → [App] → Monetisation → Products**.
2. Create **In-app products** or **Subscriptions** to match Stripe prices.
3. For subscriptions: create **base plans** and **offers**.
4. Enable **Real-time Developer Notifications (RTDN)**:
   - Create a Pub/Sub topic, grant `pubsub@system.gserviceaccount.com` publisher role.
   - Set push subscription URL: `https://api.yourbackend.com/webhooks/google`
5. Create a **Google Play service account** with `Financial data` permission;
   download the JSON key for server-side receipt verification.

---

## Step 3 — Remove Stripe from Client

### React Native / Expo

```bash
# Remove
npm uninstall @stripe/stripe-react-native

# Add
npm install react-native-purchases          # RevenueCat (recommended abstraction)
# OR use platform SDKs directly:
# npm install @react-native-google-play-billing (Android)
# StoreKit 2 via native module or expo-in-app-purchases
```

### Flutter

```bash
flutter pub remove stripe_flutter
flutter pub add in_app_purchase           # Flutter's official plugin (wraps both stores)
```

### iOS Native (Swift)

```swift
// Remove
// pod 'Stripe'  ← delete from Podfile, run `pod install`

// Add StoreKit 2 (built-in, iOS 15+; no pod needed)
import StoreKit
```

### Android Native (Kotlin)

```kotlin
// Remove from build.gradle
// implementation 'com.stripe:stripe-android:...'

// Add Play Billing Library
implementation("com.android.billingclient:billing-ktx:7.0.0")
```

---

## Step 4 — Implement IAP on iOS (StoreKit 2)

```swift
// ProductStore.swift — load products and handle purchases
import StoreKit

@MainActor
class ProductStore: ObservableObject {
    @Published private(set) var products: [Product] = []
    @Published private(set) var purchasedProductIDs: Set<String> = []

    private let productIDs: Set<String> = [
        "com.yourapp.subscription.monthly",
        "com.yourapp.premium.lifetime"
    ]

    // MARK: — Load from App Store
    func loadProducts() async {
        do {
            products = try await Product.products(for: productIDs)
        } catch {
            print("Failed to load products: \(error)")
        }
    }

    // MARK: — Purchase
    func purchase(_ product: Product) async throws -> Transaction? {
        let result = try await product.purchase()
        switch result {
        case .success(let verification):
            let transaction = try checkVerified(verification)
            await updateEntitlements(transaction)
            await transaction.finish()
            return transaction
        case .pending:
            return nil   // Ask user to complete purchase (parental approval, etc.)
        case .userCancelled:
            return nil
        @unknown default:
            return nil
        }
    }

    // MARK: — Verify (cryptographic check, free, offline)
    private func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }

    // MARK: — Entitlements: send receipt to YOUR backend
    private func updateEntitlements(_ transaction: Transaction) async {
        // Send the signed transaction to backend for server-side grant
        guard let appAccountToken = transaction.appAccountToken else { return }
        await Backend.shared.verifyAppleTransaction(
            originalTransactionID: String(transaction.originalID),
            appAccountToken: appAccountToken
        )
        purchasedProductIDs.insert(transaction.productID)
    }

    // MARK: — Restore / re-check on launch
    func refreshEntitlements() async {
        for await result in Transaction.currentEntitlements {
            if let transaction = try? checkVerified(result) {
                await updateEntitlements(transaction)
            }
        }
    }
}
```

**Critical:** Always call `transaction.finish()` after granting the entitlement.
Unfinished transactions re-queue on every app launch.

---

## Step 5 — Implement IAP on Android (Play Billing Library)

```kotlin
// BillingManager.kt
import com.android.billingclient.api.*

class BillingManager(private val context: Context) : PurchasesUpdatedListener {

    private lateinit var billingClient: BillingClient

    fun initialise() {
        billingClient = BillingClient.newBuilder(context)
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .build()

        billingClient.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    queryProducts()
                }
            }
            override fun onBillingServiceDisconnected() { /* retry */ }
        })
    }

    // Query available products
    private fun queryProducts() {
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                listOf(
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId("com.yourapp.subscription.monthly")
                        .setProductType(BillingClient.ProductType.SUBS)
                        .build()
                )
            ).build()

        billingClient.queryProductDetailsAsync(params) { result, productDetailsList ->
            if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                // Store and show productDetailsList to user
            }
        }
    }

    // Launch purchase flow
    fun launchPurchase(activity: Activity, productDetails: ProductDetails) {
        val offerToken = productDetails.subscriptionOfferDetails?.firstOrNull()?.offerToken ?: return
        val productList = listOf(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offerToken)
                .build()
        )
        val billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(productList)
            .build()
        billingClient.launchBillingFlow(activity, billingFlowParams)
    }

    // Called by Play after purchase
    override fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
        if (result.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (purchase in purchases) {
                handlePurchase(purchase)
            }
        }
    }

    private fun handlePurchase(purchase: Purchase) {
        if (purchase.purchaseState == Purchase.PurchaseState.PURCHASED) {
            // Send purchaseToken to YOUR backend for verification
            Backend.verifyGooglePurchase(
                packageName = context.packageName,
                productId = purchase.products.first(),
                purchaseToken = purchase.purchaseToken
            )
            // Acknowledge within 3 days or Google auto-refunds
            if (!purchase.isAcknowledged) {
                val ackParams = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.purchaseToken)
                    .build()
                billingClient.acknowledgePurchase(ackParams) { /* handle */ }
            }
        }
    }
}
```

**Critical:** Acknowledge Google purchases within **3 days**. Unacknowledged purchases
are automatically refunded and the entitlement must be revoked.

---

## Step 6 — Backend: Remove Stripe, Add Verification

### Remove Stripe server code

```bash
# Node.js example
npm uninstall stripe

# Remove:
# - /routes/stripe-webhooks.js
# - /routes/checkout.js (create-checkout-session, etc.)
# - /middleware/stripe-signature-verify.js
# - Stripe env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
```

### Apple receipt/notification verification (Node.js example)

```typescript
// apple-iap.service.ts
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const APPLE_ROOT_CA = process.env.APPLE_ROOT_CA_PEM!; // Download from Apple PKI

// Verify App Store Server Notification (V2 — signedPayload is a JWS)
export async function verifyAppleNotification(signedPayload: string) {
  // Decode header to get x5c cert chain
  const [headerB64] = signedPayload.split('.');
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString());
  const leafCert = header.x5c[0];

  // Verify cert chain → leaf cert → JWS signature (use a library like jose)
  const { jwtVerify, importX509 } = await import('jose');
  const publicKey = await importX509(`-----BEGIN CERTIFICATE-----\n${leafCert}\n-----END CERTIFICATE-----`, 'ES256');
  const { payload } = await jwtVerify(signedPayload, publicKey);
  return payload as AppleNotificationPayload;
}

// Grant/revoke entitlement based on notification type
export async function handleAppleNotification(payload: AppleNotificationPayload) {
  const { notificationType, subtype, data } = payload;
  const tx = data.signedTransactionInfo; // also a JWS — verify the same way

  switch (notificationType) {
    case 'SUBSCRIBED':
    case 'DID_RENEW':
      await db.entitlements.upsert({ appleOriginalTransactionId: tx.originalTransactionId, active: true });
      break;
    case 'EXPIRED':
    case 'REVOKED':
    case 'REFUND':
      await db.entitlements.update({ appleOriginalTransactionId: tx.originalTransactionId, active: false });
      break;
  }
}
```

### Google receipt verification (Node.js)

```typescript
// google-iap.service.ts
import { google } from 'googleapis';

const androidPublisher = google.androidpublisher('v3');

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});

export async function verifyGoogleSubscription(
  packageName: string,
  subscriptionId: string,
  purchaseToken: string
) {
  const authClient = await auth.getClient();
  google.options({ auth: authClient as any });

  const res = await androidPublisher.purchases.subscriptionsv2.get({
    packageName,
    token: purchaseToken,
  });

  const sub = res.data;
  const isActive = sub.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE' ||
                   sub.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';

  await db.entitlements.upsert({
    googlePurchaseToken: purchaseToken,
    active: isActive,
    expiryTime: sub.lineItems?.[0]?.expiryTime,
  });

  return isActive;
}

// Handle Pub/Sub push notification
export async function handleGoogleNotification(messageData: string) {
  const notification = JSON.parse(Buffer.from(messageData, 'base64').toString());
  const { subscriptionNotification, oneTimeProductNotification } = notification;

  if (subscriptionNotification) {
    const { notificationType, purchaseToken, subscriptionId } = subscriptionNotification;
    // notificationType 1 = RECOVERED, 2 = RENEWED, 3 = CANCELED, etc.
    await verifyGoogleSubscription(
      notification.packageName,
      subscriptionId,
      purchaseToken
    );
  }
}
```

---

## Step 7 — Database Migration

```sql
-- Add IAP columns, keep Stripe columns nullable during transition
ALTER TABLE subscriptions
  ADD COLUMN apple_original_transaction_id TEXT,
  ADD COLUMN apple_product_id              TEXT,
  ADD COLUMN google_purchase_token         TEXT,
  ADD COLUMN google_product_id             TEXT,
  ADD COLUMN payment_provider              TEXT NOT NULL DEFAULT 'stripe';

-- After full migration and grace period, you can drop Stripe columns:
-- ALTER TABLE subscriptions
--   DROP COLUMN stripe_customer_id,
--   DROP COLUMN stripe_subscription_id,
--   DROP COLUMN stripe_price_id;

-- Index for fast webhook lookups
CREATE INDEX idx_sub_apple_tx  ON subscriptions(apple_original_transaction_id);
CREATE INDEX idx_sub_google_tk ON subscriptions(google_purchase_token);
```

---

## Step 8 — Cross-Platform Abstraction (Recommended)

Avoid duplicating IAP logic across platforms. Three viable approaches:

### Option A — RevenueCat (strongly recommended for most teams)

```bash
npm install react-native-purchases
```

- Handles receipt validation, webhook normalization, entitlement management.
- Single dashboard replaces both store dashboards for analytics.
- Migration path: import existing Stripe subscribers manually, or grandfather them.
- Cost: free tier generous; 1% of revenue above $2.5k/mo.

### Option A.2 — Adapty, Glassfy (alternatives to RevenueCat)

Similar feature sets. Evaluate based on pricing model and analytics needs.

### Option B — Custom unified service layer

```typescript
// payment.service.ts — thin abstraction
interface PaymentService {
  getProducts(): Promise<Product[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<void>;
}

class ApplePaymentService implements PaymentService { /* StoreKit 2 bridge */ }
class GooglePaymentService implements PaymentService { /* Play Billing bridge */ }

export const PaymentService: PaymentService =
  Platform.OS === 'ios' ? new ApplePaymentService() : new GooglePaymentService();
```

---

## Step 9 — Handle Edge Cases

| Scenario                      | Apple                                    | Google                                      |
|-------------------------------|------------------------------------------|---------------------------------------------|
| Family sharing                | `inAppOwnershipType == .familyShared`    | `acknowledgementState` still on buyer       |
| Subscription upgrade/downgrade| New transaction, old expires immediately | `replacementMode` in `BillingFlowParams`    |
| Billing retry / grace period  | `GRACE_PERIOD` notification type         | `SUBSCRIPTION_STATE_IN_GRACE_PERIOD`        |
| Refund                        | `REFUND` notification → revoke           | `SUBSCRIPTION_REVOKED` → revoke             |
| Promotional offers            | Offer code redemption URL                | `setObfuscatedAccountId` + offer details    |
| Free trial                    | Introductory offer on subscription       | Base plan free trial days                   |
| Existing Stripe subscribers   | Grandfather at backend; skip IAP         | Same; avoid double-charging                 |

---

## Step 10 — Testing

### Apple Sandbox
- Use **sandbox Apple IDs** (App Store Connect → Users & Access → Sandbox Testers).
- Subscriptions renew at accelerated rate (1 month = 5 minutes in sandbox).
- Test StoreKit transactions in Xcode using **StoreKit configuration files** (no network needed).

```bash
# Xcode: Product → Scheme → Edit Scheme → Run → Options → StoreKit Configuration
# Point to a local .storekit file listing your products
```

### Google Test Purchases
- Add tester Gmail addresses in Play Console → License Testing.
- Use `android.test.purchased` product ID for unit tests.
- Test real subscriptions via internal test track — no real charges for testers.

### Backend webhook testing
```bash
# Apple — use App Store Server API sandbox
curl -X GET "https://api.storekit-sandbox.itunes.apple.com/inApps/v1/subscriptions/{originalTransactionId}" \
  -H "Authorization: Bearer {JWT}"

# Google — publish test Pub/Sub message
gcloud pubsub topics publish your-topic --message="$(echo '{"test":true}' | base64)"
```

---

## Step 11 — Rollout & Cutover Checklist

```
PRE-LAUNCH
□ All products created and approved in App Store Connect + Play Console
□ Server-to-server notifications configured and tested in sandbox
□ Backend receipt verification endpoints live (shadow mode — log but don't gate)
□ Entitlement DB columns added; migration run in production
□ Grandfather logic: existing Stripe subscribers bypass IAP check
□ StoreKit config file removed before archive build

LAUNCH
□ Submit iOS build for review (IAP changes require full review)
□ Roll out Android via staged release (10% → 50% → 100%)
□ Monitor webhook delivery in store dashboards
□ Monitor error rates in client IAP flows

POST-LAUNCH (30 days)
□ Cancel Stripe subscriptions for migrated users (with notice)
□ Disable Stripe webhook endpoint
□ Remove STRIPE_* env vars from all environments
□ Archive Stripe dashboard data for compliance (7-year retention in most jurisdictions)
```

---

## Common Pitfalls

- **Never validate receipts client-side only.** Always verify on your server. Client can be
  manipulated.
- **Don't cancel the old Stripe subscription immediately.** Prorate carefully; users paid for
  the current period.
- **Acknowledge Google purchases immediately.** 3-day window — build a retry queue.
- **Price changes.** App Store price changes take effect on renewal; you cannot change
  retroactively. Submit price change in App Store Connect well ahead.
- **Missing `appAccountToken` (Apple).** Set it during purchase to link Apple transaction to
  your user; cannot be set after the fact.
- **Obfuscated account ID (Google).** Set `setObfuscatedAccountId(userId)` in
  `BillingFlowParams` so your backend can link purchases to users in Pub/Sub notifications.
- **Restore Purchases button required (Apple).** App Review rejects apps without a visible
  Restore Purchases button for subscriptions.
- **Free apps with IAP.** Update the app's price on both stores if you were previously
  charging via Stripe (which would have been a guideline violation anyway).

---

## Dependencies Reference

| Platform       | Package / Framework            | Version  |
|----------------|--------------------------------|----------|
| iOS native     | StoreKit 2 (built-in)          | iOS 15+  |
| Android native | Play Billing Library KTX       | 7.x      |
| React Native   | react-native-purchases         | 8.x      |
| Flutter        | in_app_purchase                | 3.x      |
| Backend Node   | googleapis                     | 144+     |
| Backend Node   | jose (JWT/JWS verification)    | 5.x      |
| Backend Python | google-api-python-client       | 2.x      |
| Backend Python | PyJWT + cryptography           | latest   |
