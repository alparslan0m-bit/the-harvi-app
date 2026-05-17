# Modal & Sheet Patterns: Native Presentation & Billing Sheets

This document defines the modal, bottom sheet, and transactional redirection patterns of the Harvi application. It explains how to implement native-feeling presentation sheets, dynamic swipe layouts, and external payment browsers in React Native.

---

## 1. Native Presentation Modals via Expo Router

Harvi leverages Expo Router's native modal controllers for pages that require full focus (e.g. paying for a module). Rather than custom component layers that float on top of screens, these utilize standard iOS/Android native presentation engines:

### Registering Modals (`app/_layout.tsx`)
```typescript
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  
  {/* Declares the purchase directory as a native bottom sheet modal */}
  <Stack.Screen 
    name="purchase/[moduleId]" 
    options={{ 
      presentation: 'modal', 
      animation: 'slide_from_bottom' 
    }} 
  />
</Stack>
```

### Triggering Modal Navigation
```typescript
router.push({
  pathname: `/purchase/${moduleId}`,
  params: { moduleName: "Cardiology I", priceDisplay: "$9.99" }
});
```

---

## 2. WebBrowser Stripe Checkout Modals

When a user completes a paywall action, the app must never direct them out of the app to standard Safari or Chrome browsers (which ruins retention and flow). Instead, it loads Stripe Checkout inside a **secure internal sheet** using Expo's `WebBrowser` module, capturing callback URLs upon purchase resolution:

### Invocation Code Pattern (`hooks/usePurchase.ts`)
```typescript
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

export async function handlePurchase(checkoutUrl: string, successUrl: string) {
  // Open secure WebBrowser auth session sheet
  const result = await WebBrowser.openAuthSessionAsync(checkoutUrl, successUrl);

  if (result.type !== "success") {
    // User closed the payment sheet manually
    return { success: false, cancelled: true };
  }

  // Parse callback redirection URL
  const url = new URL(result.url);
  const sessionId = url.searchParams.get("session_id");

  return { success: true, sessionId };
}
```

---

## 3. Dynamic Swipe-Down Bottom Sheets

For interactive sheets (such as choosing a custom application theme), the layout utilizes a standard swipeable bottom modal container with safe-area paddings:

```tsx
<Modal
  visible={isVisible}
  animationType="slide"
  transparent={true}
  onRequestClose={onClose}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
      
      {/* Visual Grab Handle Indicator */}
      <View style={[styles.grabHandle, { backgroundColor: colors.border }]} />
      
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Select Theme</Text>
      </View>
      
      {children}
    </View>
  </View>
</Modal>
```

### Styling
```typescript
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Dimmed overlay backdrop
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  grabHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    alignSelf: "center",
    marginBottom: 8,
  }
});
```
