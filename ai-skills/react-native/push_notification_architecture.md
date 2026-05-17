# Push Notification Architecture: Native FCM/APNS & Background Syncs

This document defines the push notification systems, native platform credential setups, and background database warming tasks of the App Factory mobile client.

---

## 1. Native Credentials & Expo Notifications

Harvi manages push notifications using `expo-notifications`. It interfaces with **Apple Push Notification Service (APNS)** on iOS and **Firebase Cloud Messaging (FCM)** on Android:

### Root App Configuration (`app.json`)
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#0ea5e9",
          "sounds": ["./assets/sounds/success.wav"]
        }
      ]
    ]
  }
}
```

---

## 2. Dynamic Register & Token Exchange

To register a device and link its unique token to a user profile in Supabase:

```typescript
// hooks/usePushNotifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export async function registerForPushNotificationsAsync(userId: string) {
  if (!Device.isDevice) {
    return { error: "Must use physical device for Push Notifications" };
  }

  // 1. Request OS Permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return { error: "Permission to receive notifications was denied" };
  }

  // 2. Fetch Expo Push Token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "your-eas-project-id" // Found in app.json credentials
    });

    const token = tokenData.data;

    // 3. Persist Token on User Profile
    const { error } = await supabase
      .from("profiles")
      .update({ expo_push_token: token, platform: Platform.OS })
      .eq("id", userId);

    if (error) throw error;
    return { token, error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Token fetch failed" };
  }
}
```

---

## 3. Background Sync via Silent Push Notifications

To coordinate sync warming tasks (such as downloading fresh subject data in the background before the user even opens the app), Harvi uses **Silent Push Notifications** (push payloads containing `"content-available": 1` on iOS or high-priority data payloads on Android):

```typescript
// app/_layout.tsx
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";
import { syncOfflineQueue } from "@/lib/offlineQueue";

const BACKGROUND_SYNC_TASK = "BACKGROUND_SYNC_TASK";

// Register task executor
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const hasDataSynced = await syncOfflineQueue();
    return hasDataSynced 
      ? BackgroundFetch.BackgroundFetchResult.NewData 
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Registers task inside system task managers
export async function registerBackgroundSync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
    minimumInterval: 60 * 15, // Run every 15 minutes at minimum
    stopOnTerminate: false,   // Keep active even if user swipes app away
    startOnBoot: true,        // Automatically register on device startup
  });
}
```

---

## 4. Notification Lifecycle Observers

Foreground notifications must be handled cleanly so they do not interrupt active user flows (like quizzes):

```typescript
useEffect(() => {
  // Configures how foreground notifications show
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Listener for active notification arrival
  const receiveSub = Notifications.addNotificationReceivedListener((notification) => {
    const { action } = notification.request.content.data;
    if (action === "force_sync") {
      syncOfflineQueue().catch(() => {});
    }
  });

  // Listener for user tapping/interacting with notification
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data;
    if (data.route) {
      router.push(data.route);
    }
  });

  return () => {
    receiveSub.remove();
    responseSub.remove();
  };
}, []);
```

---

# Anti-Patterns

*   **Blocking Main Thread on Notification Arrive**: Running heavy, complex logic or file writing inside foreground notification listeners.
    *   *Consequence*: UI hangs or animations stutter while processing background data.
*   **Prompting Permissions on Startup**: Triggering the iOS/Android notification permission prompt on the first app mount.
    *   *Consequence*: Users will reject permissions as they have not yet built trust or understood the value of notifications, destroying long-term engagement rates. Always ask contextually (e.g. after a user bookmarks a topic or finishes a quiz).
*   **Assuming Constant Background Availability**: Relying entirely on background fetch tasks to keep the offline database accurate.
    *   *Consequence*: The OS frequently throttles or stops background tasks to optimize battery. Always perform a quick sync pre-flight on app start.
