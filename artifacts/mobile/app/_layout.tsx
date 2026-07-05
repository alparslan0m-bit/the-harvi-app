import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";

import { ErrorBoundary } from "@/src/shared/components";
import { AuthProvider, useAuth } from "@/src/shared/store/authStore";
import { PurchaseProvider } from "@/src/shared/store/purchaseStore";
import { SyncProvider } from "@/src/shared/store/syncStore";
import { ThemeProvider } from "@/src/shared/store/themeStore";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24,
      networkMode: "offlineFirst",
      retry: 1,
    },
  },
});

function RootLayoutNav({ fontsLoaded, fontError }: { fontsLoaded: boolean; fontError: Error | null }) {
  const { loading } = useAuth();

  useEffect(() => {
    if ((fontsLoaded || fontError) && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, loading]);

  if (!fontsLoaded && !fontError) return null;
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(main)/(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
      <Stack.Screen name="(main)/quiz/[lectureId]" options={{ headerShown: false }} />
      <Stack.Screen name="(main)/purchase/[moduleId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="(auth)/callback" options={{ headerShown: false }} />
      <Stack.Screen name="(main)/profile/edit" options={{ headerShown: false }} />
      <Stack.Screen
        name="+not-found"
        options={{ headerShown: true, title: "Not Found" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  return (
    <>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <ThemeProvider>
                  <AuthProvider>
                    <PurchaseProvider>
                      <SyncProvider>
                        <RootLayoutNav fontsLoaded={fontsLoaded} fontError={fontError} />
                      </SyncProvider>
                    </PurchaseProvider>
                  </AuthProvider>
                </ThemeProvider>
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </>
  );
}

