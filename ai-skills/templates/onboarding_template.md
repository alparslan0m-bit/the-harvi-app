# Onboarding Template: Scaffolding Blueprint for Psychological Sliders

This template provides the standard multi-slide flatlist structure, dynamic spring-loaded progress bar, native haptic feedback indicators, and high-converting CTA triggers required to construct a premium onboarding flow in the App Factory workspace.

---

## 📂 Proposed File Path

Onboarding screens reside inside initial route stacks to capture users prior to auth entry. For example:

```
c:\Users\METRO\harvi gamed\
└── app/
    └── onboarding.tsx           # Multi-Step psychological Slider Screen
```

---

## 💻 Code Scaffolding

```tsx
// app/onboarding.tsx
import React, { useState, useRef, useCallback } from "react";
import { 
  FlatList, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  View, 
  Dimensions, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from "react-native";
import { useColors } from "@/hooks/useColors";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  description: string;
  iconName: string;
}

const SLIDES: Slide[] = [
  { id: "1", title: "Study Smarter, Not Harder", description: "Bite-sized medical lectures and quizzes tailored to your exam path.", iconName: "book-open" },
  { id: "2", title: "Target High-Yield Metrics", description: "Monitor active performance margins, tracking precise growth values.", iconName: "trending-up" },
  { id: "3", title: "Offline & Always Ready", description: "Save progress dynamically, syncing to database layers once online.", iconName: "wifi-off" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);

  // ── 1. REANIMATED SPRING PROGRESS BAR ──
  const progressShared = useSharedValue(1 / SLIDES.length);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    if (index !== currentIndex) {
      // A. Physical Haptic Tick feedback on index shift
      Haptics.selectionAsync().catch(() => {});
      setCurrentIndex(index);
      progressShared.value = withSpring((index + 1) / SLIDES.length, {
        damping: 15,
        stiffness: 120
      });
    }
  }, [currentIndex, progressShared]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressShared.value * 100}%`,
  }));

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      // B. Trigger Haptic Success on Onboarding complete
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/auth");
    }
  };

  const renderItem = useCallback(({ item }: { item: Slide }) => (
    <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primary + "1A" }]}>
        <Text style={[styles.iconText, { color: colors.primary }]}>ℹ️</Text>
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]}>{item.description}</Text>
    </View>
  ), [colors]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
      />

      {/* Footer Controls */}
      <View style={styles.footer}>
        {/* Spring Progress bar track */}
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <Animated.View style={[styles.progressFill, { backgroundColor: colors.primary }, progressStyle]} />
        </View>

        <TouchableOpacity 
          onPress={handleNext} 
          activeOpacity={0.85} 
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.btnText}>
            {currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slideContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  iconBox: { width: 96, height: 96, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  iconText: { fontSize: 32 },
  title: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
  desc: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, paddingHorizontal: 12 },
  footer: { paddingHorizontal: 40, paddingBottom: 48, gap: 24 },
  progressTrack: { height: 6, borderRadius: 3, width: "100%", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  nextBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", width: "100%" },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Strict Haptic Integration**: Tick index shifts must trigger physical haptic selectors (`Haptics.selectionAsync()`) to build premium interaction weight.
2.  **Enforce Spring Physics in progress track**: Linear progress changes feel basic. Progress bar adjustments must utilize elastic spring dynamics via Reanimated.
3.  **Strict Scroll Event throttling**: Set `scrollEventThrottle={16}` on FlatList scrolling monitors to ensure calculations match mobile hardware frame rates (60Hz/120Hz).

---

## 📈 Scalability Notes

*   **Avoid High-Resolution image loading**: Do not load massive static images in horizontal lists. This balloons memory heap allocations, causing slower scroll rates. Prefer compact, lightweight vectors or micro-animations.
*   **Redirect Gaters**: Route complete states must replace navigation histories (`router.replace`) to prevent registered users from hitting hardware back buttons to return to onboarding layouts.
