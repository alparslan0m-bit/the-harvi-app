import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Feather } from "@expo/vector-icons";
import { useFeedback } from "@/hooks/useFeedback";
import { useColors } from "@/hooks/useColors";

interface FeedbackFormProps {
  userId?: string;
}

/**
 * A self-contained feedback form component.
 * Extracted from ProfileScreen.
 */
export function FeedbackForm({ userId }: FeedbackFormProps) {
  const colors = useColors();
  const {
    feedbackText, updateText,
    submitting, feedbackSent, feedbackError,
    cooldownSecs, isDisabled, isTooShort,
    handleSubmit,
  } = useFeedback(userId);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TextInput
        style={[styles.textarea, {
          color: colors.foreground,
          borderColor: feedbackError ? colors.destructive + "4D" : colors.border,
          backgroundColor: colors.background,
        }]}
        placeholder="Share your thoughts, report a bug, or suggest a feature…"
        placeholderTextColor={colors.mutedForeground}
        multiline
        numberOfLines={4}
        value={feedbackText}
        onChangeText={updateText}
        textAlignVertical="top"
        maxLength={500}
        editable={!isDisabled}
      />

      <Text style={[styles.charCount, {
        color: feedbackText.length >= 480 ? colors.destructive : feedbackText.length >= 400 ? colors.warning : colors.mutedForeground,
      }]}>
        {feedbackText.length} / 500
      </Text>

      {feedbackSent && (
        <View style={[styles.alertBox, { backgroundColor: colors.success + "1A", borderColor: colors.success + "33" }]}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={[styles.alertText, { color: colors.foreground }]}>Feedback sent — thank you!</Text>
        </View>
      )}

      {feedbackError && (
        <View style={[styles.alertBox, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "33" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.alertText, { color: colors.foreground, flex: 1 }]} numberOfLines={3}>
            {feedbackError}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: isDisabled || isTooShort ? colors.muted : colors.primary }]}
        onPress={handleSubmit}
        disabled={isDisabled || isTooShort}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : cooldownSecs > 0 ? (
          <View style={styles.cooldownContainer}>
            <Feather name="clock" size={14} color={colors.mutedForeground} />
            <Text style={[styles.submitBtnText, { color: colors.mutedForeground }]}>Wait {cooldownSecs}s</Text>
          </View>
        ) : (
          <Text style={[styles.submitBtnText, { color: isTooShort ? colors.mutedForeground : "#fff" }]}>Submit Feedback</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 24, gap: 12 },
  textarea: { 
    borderWidth: 1, 
    borderRadius: 14, 
    padding: 14, 
    fontSize: 14, 
    fontFamily: "Inter_400Regular", 
    minHeight: 96, 
    lineHeight: 22 
  },
  charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4, marginBottom: 2 },
  alertBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  alertText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  submitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  submitBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cooldownContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
});
