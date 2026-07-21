import { Feather, FontAwesome } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/src/shared/hooks/useColors";
import { Lecture } from "@/src/shared/types";

interface Props {
  lecture: Lecture;
  index: number;
  /** Best score percentage (0-100) for this lecture, undefined if never attempted */
  bestScorePercent?: number | undefined;
  /** True when new questions were added since this lecture was last downloaded */
  hasNewQuestions?: boolean | undefined;
  /** True when questions are pre-cached for offline use */
  isCached?: boolean | undefined;
  /** True when the lecture (or parent subject/module) is free */
  isFree?: boolean | undefined;
  onPress: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** Maps a 0-100 percentage to 0/1/2/3 filled stars */
function scoreToStars(percent: number): number {
  if (percent <= 0) return 0;
  if (percent <= 33) return 1;
  if (percent <= 66) return 2;
  return 3;
}

const STAR_COLOR_FILLED = "#F59E0B"; // Warm amber
const STAR_COLOR_EMPTY = "#E2E8F0"; // Subtle neutral

export function LectureCard({
  lecture,
  index,
  bestScorePercent,
  hasNewQuestions = false,
  isCached = false,
  isFree = false,
  onPress,
}: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const hasAttempted = bestScorePercent != null && bestScorePercent > 0;
  const filledStars = hasAttempted ? scoreToStars(bestScorePercent) : 0;

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        animStyle,
      ]}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 20 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 20 });
      }}
      activeOpacity={1}
    >
      {/* Vertical Accent Stripe */}
      <View
        style={[
          styles.accentStripe,
          {
            backgroundColor:
              filledStars === 3
                ? STAR_COLOR_FILLED
                : hasAttempted
                  ? STAR_COLOR_FILLED + "66"
                  : colors.primary + "33",
          },
        ]}
      />

      {/* Index Badge */}
      <View
        style={[
          styles.indexBadge,
          {
            backgroundColor:
              filledStars === 3
                ? STAR_COLOR_FILLED + "1A"
                : colors.muted,
          },
        ]}
      >
        <Text
          style={[
            styles.indexText,
            {
              color:
                filledStars === 3
                  ? STAR_COLOR_FILLED
                  : colors.mutedForeground,
            },
          ]}
        >
          {index + 1}
        </Text>
      </View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {lecture.name}
          </Text>
          {hasNewQuestions && (
            <View
              style={[styles.newBadge, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {isFree && (
            <View
              style={[styles.newBadge, { backgroundColor: colors.success }]}
            >
              <Text style={styles.newBadgeText}>FREE</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {lecture.question_count != null && lecture.question_count > 0 && (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>
              {lecture.question_count} questions
            </Text>
          )}
          {isCached && !hasNewQuestions && (
            <View style={styles.cachedChip}>
              <Feather name="download" size={9} color={colors.primary} />
              <Text style={[styles.cachedText, { color: colors.primary }]}>
                downloaded
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Star Rating */}
      <View style={styles.starsContainer}>
        {[0, 1, 2].map((i) => {
          const isFilled = i < filledStars;
          return (
            <FontAwesome
              key={i}
              name={isFilled ? "star" : "star-o"}
              size={14}
              color={isFilled ? STAR_COLOR_FILLED : colors.border}
              style={isFilled ? styles.starFilled : undefined}
            />
          );
        })}
      </View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 16,
    paddingRight: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  accentStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginRight: 12,
  },
  indexText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  textCol: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
    letterSpacing: -0.4,
    lineHeight: 24,
    flexShrink: 1,
  },
  newBadge: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cachedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  cachedText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginLeft: 8,
  },
  starFilled: {
    // Subtle shadow glow on filled stars
    textShadowColor: "#F59E0B44",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
