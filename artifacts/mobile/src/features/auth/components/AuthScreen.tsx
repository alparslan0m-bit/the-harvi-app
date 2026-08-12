import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SupabaseSetupHelper } from "@/src/shared/components";
import { useColors } from "@/src/shared/hooks/useColors";
import { THEME } from "@/src/shared/constants/theme";
import { useAuthForm } from "@/src/features/auth/hooks/useAuthForm";
import { AnimatedPressable } from "@/src/shared/components";

function GoogleIcon() {
  return (
    <View style={googleIconStyles.container}>
      <Text style={googleIconStyles.g}>G</Text>
    </View>
  );
}

const googleIconStyles = StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  g: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#4285F4",
    letterSpacing: -0.5,
  },
});

export function AuthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    googleLoading,
    error,
    showPassword,
    setShowPassword,
    showSetup,
    setShowSetup,
    focusedField,
    setFocusedField,
    handleSubmit,
    handleGoogleSignIn,
    toggleMode,
  } = useAuthForm();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.inner,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 40),
            paddingBottom: insets.bottom + 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={[styles.logoMark, { backgroundColor: colors.primary }]}>
            <Feather name="activity" size={28} color="#fff" />
          </View>
          <Text style={[styles.appName, { color: colors.foreground }]}>
            Harvi
          </Text>
          <Text style={[styles.tagline, { color: colors.mutedForeground }]}>
            Medical Education, Elevated.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Google Sign-In */}
          <AnimatedPressable
            feedback="scale"
            style={[
              styles.googleBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <>
                <GoogleIcon />
                <Text
                  style={[styles.googleBtnText, { color: colors.foreground }]}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </AnimatedPressable>

          {/* Setup helper */}
          <SupabaseSetupHelper
            showSetup={showSetup}
            onToggle={() => setShowSetup((v) => !v)}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
            <Text
              style={[styles.dividerText, { color: colors.mutedForeground }]}
            >
              or
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: colors.border }]}
            />
          </View>

          {/* Email */}
          <View
            style={[
              styles.inputWrap,
              {
                borderColor:
                  focusedField === "email" ? colors.primary : colors.border,
                backgroundColor: colors.card,
                borderWidth: focusedField === "email" ? 2 : 1,
              },
            ]}
          >
            <Feather
              name="mail"
              size={18}
              color={
                focusedField === "email"
                  ? colors.primary
                  : colors.mutedForeground
              }
            />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Email address"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputWrap,
              {
                borderColor:
                  focusedField === "password" ? colors.primary : colors.border,
                backgroundColor: colors.card,
                borderWidth: focusedField === "password" ? 2 : 1,
              },
            ]}
          >
            <Feather
              name="lock"
              size={18}
              color={
                focusedField === "password"
                  ? colors.primary
                  : colors.mutedForeground
              }
            />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <AnimatedPressable
              feedback="scale"
              onPress={() => setShowPassword(!showPassword)}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={18}
                color={
                  focusedField === "password"
                    ? colors.primary
                    : colors.mutedForeground
                }
              />
            </AnimatedPressable>
          </View>

          {error && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + "1A",
                  borderColor: colors.destructive + "33",
                },
              ]}
            >
              <Feather
                name="alert-circle"
                size={14}
                color={colors.destructive}
              />
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error}
              </Text>
            </View>
          )}

          <AnimatedPressable
            feedback="scale"
            style={[styles.btn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text
                style={[styles.btnText, { color: colors.primaryForeground }]}
              >
                {mode === "login" ? "Sign In" : "Create Account"}
              </Text>
            )}
          </AnimatedPressable>

          <AnimatedPressable
            feedback="scale"
            onPress={toggleMode}
            style={styles.switchRow}
          >
            <Text
              style={[styles.switchText, { color: colors.mutedForeground }]}
            >
              {mode === "login"
                ? "Don't have an account? "
                : "Already have an account? "}
            </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>
              {mode === "login" ? "Sign Up" : "Sign In"}
            </Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 36 },
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: THEME.radius,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.2,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    letterSpacing: -0.2,
  },
  form: { gap: 12 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: THEME.radius,
    borderWidth: 1.5,
  },
  googleBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.2,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  btn: {
    paddingVertical: 16,
    borderRadius: THEME.radius,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: -0.3,
  },
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  switchText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  switchLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
