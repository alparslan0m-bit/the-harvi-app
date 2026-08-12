import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useColors, type PaletteFamily } from "@/src/shared/hooks/useColors";

interface DayData {
  day: string;
  count: number;
  isToday?: boolean;
}

interface Props {
  data: DayData[];
}

const BAR_MAX_H = 72;

function AnimatedBar({
  item,
  index,
  maxCount,
}: {
  item: DayData;
  index: number;
  maxCount: number;
}): React.ReactElement {
  const colors = useColors();
  const chartPalette = colors.statCardFamilies[0] as PaletteFamily;
  const progress = useSharedValue(0);

  const targetH =
    item.count > 0 ? Math.max((item.count / maxCount) * BAR_MAX_H, 12) : 0;

  useEffect(() => {
    progress.value = withDelay(
      index * 60,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.count]);

  const barStyle = useAnimatedStyle(() => ({
    height: progress.value * targetH,
  }));

  const isActive = item.count > 0;
  const barColor = item.isToday
    ? chartPalette.solid
    : isActive
      ? chartPalette.solid + "99"
      : colors.muted;

  return (
    <View style={styles.barWrapper}>
      {/* Count label above bar */}
      <View style={styles.labelWrap}>
        {isActive && (
          <Text
            style={[
              styles.countLabel,
              {
                color: item.isToday
                  ? chartPalette.solid
                  : colors.mutedForeground,
              },
            ]}
          >
            {item.count}
          </Text>
        )}
      </View>

      {/* Bar track — uses Coral fill for warmth */}
      <View
        style={[styles.track, { backgroundColor: chartPalette.fill + "66" }]}
      >
        <Animated.View
          style={[styles.bar, barStyle, { backgroundColor: barColor }]}
        />
      </View>

      {/* Day label */}
      <Text
        style={[
          styles.dayLabel,
          {
            color: item.isToday ? chartPalette.solid : colors.mutedForeground,
            fontFamily: item.isToday ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {item.day}
      </Text>

      {/* Today dot */}
      {item.isToday && (
        <View
          style={[styles.todayDot, { backgroundColor: chartPalette.solid }]}
        />
      )}
    </View>
  );
}

export function WeeklyChart({ data }: Props): React.ReactElement {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => (
        <AnimatedBar key={item.day} item={item} index={i} maxCount={maxCount} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 110,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  labelWrap: {
    height: 16,
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  track: {
    width: "62%",
    height: BAR_MAX_H,
    borderRadius: 12, // §6.3 sm
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    borderRadius: 12, // §6.3 sm
  },
  dayLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
