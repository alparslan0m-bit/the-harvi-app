import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useColors } from "@/src/shared/hooks/useColors";

interface Props {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  icon: keyof typeof Feather.glyphMap;
  readOnly?: boolean;
  note?: string;
  onClear?: () => void;
  onSubmitEditing?: () => void;
}

export function ProfileEditField({ 
  label, value, onChangeText, placeholder, icon, readOnly, note, onClear, onSubmitEditing 
}: Props) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[
        styles.fieldBox, 
        { 
          backgroundColor: readOnly ? colors.muted + "80" : colors.card, 
          borderColor: colors.border 
        }
      ]}>
        {!readOnly && <View style={[styles.innerBorder, { borderColor: "rgba(255,255,255,0.1)" }]} />}
        <Feather name={icon} size={16} color={colors.mutedForeground} style={styles.fieldIcon} />
        
        {readOnly ? (
          <Text style={[styles.fieldReadOnly, { color: colors.mutedForeground }]} numberOfLines={1}>
            {value}
          </Text>
        ) : (
          <TextInput
            style={[styles.fieldInput, { color: colors.foreground }]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={onSubmitEditing}
            maxLength={40}
            autoCapitalize="words"
          />
        )}

        {readOnly && <Feather name="lock" size={13} color={colors.mutedForeground} />}
        {!readOnly && value.length > 0 && onClear && (
          <TouchableOpacity onPress={onClear} activeOpacity={0.7}>
            <Feather name="x-circle" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      {note && <Text style={[styles.fieldNote, { color: colors.mutedForeground }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: { marginBottom: 24 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 2,
  },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1.5,
    zIndex: 1,
  },
  fieldIcon: { flexShrink: 0, zIndex: 2 },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    padding: 0,
    zIndex: 2,
  },
  fieldReadOnly: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    zIndex: 2,
  },
  fieldNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
    marginLeft: 2,
  },
});
