import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, Redirect } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LectureCard } from "./LectureCard";
import { SubjectDownloadButton } from "./SubjectDownloadButton";
import { useColors } from "@/src/shared/hooks/useColors";
import { useHierarchy } from "@/src/features/learn/hooks/useHierarchy";
import { useProgress } from "@/src/features/learn/hooks/useProgress";
import { useSubjectCache } from "@/src/features/learn/hooks/useSubjectCache";
import { useModuleAccess } from "@/src/features/learn/hooks/useModuleAccess";

export function SubjectScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id || typeof id !== "string") return <Redirect href="/+not-found" />;
  const { data: years } = useHierarchy();
  const { data: accessMap } = useModuleAccess();
  const completedIds = useProgress();

  const subject = years
    ?.flatMap((y) => y.modules)
    .flatMap((m) => m.subjects)
    .find((s) => s.id === id);

  // Find parent module for access checks and purchase navigation
  const parentModule = years
    ?.flatMap((y) => y.modules)
    .find((m) => m.subjects.some((s) => s.id === id));

  const moduleAccess = parentModule ? accessMap?.get(parentModule.id) : undefined;
  const hasAccess = !!moduleAccess?.has_access;

  const { status, progress, lectureInfo, downloadSubject, newQuestionCount } =
    useSubjectCache(subject);

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  if (!subject) return null;

  const totalCount = subject.lectures.length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 14,
            backgroundColor: colors.background,
            borderBottomColor: "transparent",
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.muted }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>

        <View style={styles.titleWrapper}>
          <Text
            style={[styles.headerTitle, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {subject.name}
          </Text>
        </View>

        {/* Placeholder for balance */}
        <View style={styles.spacer} />
      </View>

      {/* ── Download row ─────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <View
          style={[
            styles.downloadRow,
            {
              borderBottomColor: colors.border,
              backgroundColor: colors.background,
            },
          ]}
        >
          <View style={styles.downloadLeft}>
            <Feather name="wifi-off" size={13} color={colors.mutedForeground} />
            <Text
              style={[styles.downloadLabel, { color: colors.mutedForeground }]}
            >
              Offline access
            </Text>
          </View>
          <SubjectDownloadButton
            status={status}
            progress={progress}
            newQuestionCount={newQuestionCount}
            onPress={downloadSubject}
          />
        </View>
      )}

      {/* ── New-questions banner ─────────────────────────────────────────── */}
      {status === "stale" && newQuestionCount > 0 && (
        <View
          style={[
            styles.staleBanner,
            {
              backgroundColor: colors.warning + "1A",
              borderColor: colors.warning + "4D",
            },
          ]}
        >
          <Feather name="alert-circle" size={14} color={colors.warning} />
          <Text style={[styles.staleText, { color: colors.foreground }]}>
            {newQuestionCount} new question{newQuestionCount !== 1 ? "s" : ""}{" "}
            added to this subject — tap "Update available" to get the latest.
          </Text>
        </View>
      )}

      {/* ── Lecture list ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          LECTURES
        </Text>

        {subject.lectures.map((lec, i) => {
          const isCompleted =
            completedIds.has(lec.external_id) || completedIds.has(lec.id);
          const info = lectureInfo.find((li) => li.lectureId === lec.id);
          const isCached = info?.isCached ?? false;
          const hasNewQuestions = info?.isStale ?? false;
          
          const isLectureFree = !!lec.is_free;
          const canAccessLecture = hasAccess || isLectureFree;

          return (
            <LectureCard
              key={lec.id}
              lecture={lec}
              index={i}
              completed={isCompleted}
              isCached={isCached}
              hasNewQuestions={hasNewQuestions}
              isFree={isLectureFree}
              onPress={() => {
                if (!canAccessLecture && parentModule) {
                  router.push({
                    pathname: "/purchase/[moduleId]",
                    params: {
                      moduleId: parentModule.id,
                      moduleName: parentModule.name,
                      priceDisplay: `$${((moduleAccess?.price_cents ?? 0) / 100).toFixed(2)}`,
                      productId: parentModule.external_price_id || "",
                      totalSubjects: String(parentModule.subjects.length),
                      totalLectures: String(parentModule.subjects.reduce((s, sub) => s + sub.lectures.length, 0)),
                      totalQuestions: String(parentModule.subjects.reduce((s, sub) => s + sub.lectures.reduce((ls, l) => ls + (l.question_count ?? 0), 0), 0)),
                    },
                  });
                } else {
                  router.push({
                    pathname: "/quiz/[lectureId]",
                    params: { lectureId: lec.id, lectureName: lec.name },
                  });
                }
              }}
            />
          );
        })}

        {subject.lectures.length === 0 && (
          <View style={styles.empty}>
            <Feather
              name="book-open"
              size={36}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No lectures yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { width: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrapper: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Nunito_800ExtraBold",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 28,
  },
  downloadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
  },
  downloadLeft: { flexDirection: "row", alignItems: "center", gap: 7 },
  downloadLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },

  staleBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  staleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  list: { paddingTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});

