import { useFocusEffect, useScrollToTop } from "@react-navigation/native";
import { router, Href } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, ScrollView } from "react-native";
import { useAuth } from "@/src/shared/store/authStore";

export function useLearnFlow(scrollRef: React.RefObject<ScrollView | null>) {
  const { session, loading: authLoading } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 1. Auth Guard
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login" as Href);
    }
  }, [session, authLoading]);

  // 2. Scroll to top management
  useScrollToTop(scrollRef);

  // 3. Animations
  const translateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 0],
  });

  useFocusEffect(
    React.useCallback(() => {
      fadeAnim.setValue(0);
      Animated.spring(fadeAnim, {
        toValue: 1,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      return () => clearTimeout(timer);
    }, [fadeAnim, scrollRef]),
  );

  return {
    authLoading,
    fadeAnim,
    translateY,
  };
}
