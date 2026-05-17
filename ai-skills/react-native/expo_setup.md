# Expo Setup & Production Application Configurations

This document details the Expo app configurations, EAS build environments, and native permissions configurations of the Harvi application.

---

## 1. App Configuration (`app.json`)

The application uses an explicit, production-ready `app.json` manifest specifying platform assets, schemes, target orientations, and native plugin setups:

```json
{
  "expo": {
    "name": "Harvi",
    "slug": "harvi",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#0f172a"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.harvi.app",
      "infoPlist": {
        "NSCameraUsageDescription": "Harvi requires camera permissions to upload user profile pictures."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0f172a"
      },
      "package": "com.harvi.app"
    },
    "scheme": "harvi",
    "plugins": [
      "expo-router",
      [
        "expo-secure-store",
        {
          "faceIDPermission": "Harvi requires Face ID permissions to log you in securely."
        }
      ]
    ]
  }
}
```

---

## 2. Dynamic Asset Preloading

To ensure the splash screen holds cleanly until the application bundle is completely prepared and parsed, key image and audio assets are preloaded on mount inside `app/_layout.tsx`:

```typescript
import { Asset } from "expo-asset";
import { Image } from "react-native";
import { useEffect, useState } from "react";

export function usePreloadAssets() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        const imageAssets = [
          require("@/assets/logo.png"),
          require("@/assets/splash.png"),
        ].map((img) => Asset.fromModule(img).downloadAsync());

        await Promise.all(imageAssets);
      } catch (e) {
        console.warn("Asset preloading failed", e);
      } finally {
        setReady(true);
      }
    }
    prepare();
  }, []);

  return ready;
}
```

---

## 3. EAS Production Build Configurations (`eas.json`)

To build native `.ipa` and `.apk` distributions without local macOS dependencies, the repository utilizes EAS Build:

```json
{
  "cli": {
    "version": ">= 9.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```
---

## 4. Native Setup Rules

1.  **Always enable Portrait orientation**: Medical quiz engines should have their orientation locked to `"portrait"` inside `app.json`. This prevents layout breaks when users take quizzes lying down or moving.
2.  **Explicit Bundle Identifiers**: Ensure `bundleIdentifier` (iOS) and `package` (Android) match exact reverse DNS conventions (`com.company.product`). DRIFT between these identifiers will cause Apple OAuth or Google Sign-In redirect loops.
