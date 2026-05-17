# Form Template: Scaffolding Blueprint for Safe Inputs & Validation

This template provides the standard keyboard-avoiding structure, dynamic focused border styling, password visibility togglers, and inline validation banners required to build bulletproof forms in the App Factory workspace.

---

## 📂 Proposed File Path

Form inputs and settings panels are best structured as custom components or modular fields. For example:

```
c:\Users\METRO\harvi gamed\
└── components/ui/
    └── CustomInputField.tsx     # Reusable Field Wrapper
```

---

## 💻 Code Scaffolding

```tsx
// components/ui/CustomInputField.tsx
import React, { useState } from "react";
import { 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  View 
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export interface FormValues {
  email: string;
  password: string;
}

export function SampleRegisterForm() {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!email.includes("@")) {
      setValidationError("Please enter a valid medical email address");
      return;
    }
    if (password.length < 8) {
      setValidationError("Password must contain at least 8 characters");
      return;
    }
    setValidationError(null);
    console.log("Form submitted successfully:", { email, password });
  };

  return (
    // ── 1. KEYBOARD-AVOIDING WRAPPER ──
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardContainer}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContainer}>
        {/* ── 2. INLINE VALIDATION BANNER ── */}
        {validationError && (
          <View style={[styles.errorBanner, { backgroundColor: colors.destructive + "1A", borderColor: colors.destructive + "33" }]}>
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{validationError}</Text>
          </View>
        )}

        {/* ── 3. EMAIL INPUT FIELD WITH FOCUSED BORDERS ── */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.card,
              borderColor: focusedField === "email" ? colors.primary : colors.border,
              borderWidth: focusedField === "email" ? 2 : 1,
            },
          ]}
        >
          <Feather
            name="mail"
            size={18}
            color={focusedField === "email" ? colors.primary : colors.mutedForeground}
          />
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            placeholder="Email Address"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (validationError) setValidationError(null);
            }}
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
          />
        </View>

        {/* ── 4. PASSWORD FIELD WITH VISIBILITY TOGGLE ── */}
        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: colors.card,
              borderColor: focusedField === "password" ? colors.primary : colors.border,
              borderWidth: focusedField === "password" ? 2 : 1,
            },
          ]}
        >
          <Feather
            name="lock"
            size={18}
            color={focusedField === "password" ? colors.primary : colors.mutedForeground}
          />
          <TextInput
            style={[styles.input, { color: colors.foreground }, styles.passwordInput]}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (validationError) setValidationError(null);
            }}
            onFocus={() => setFocusedField("password")}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={18}
              color={focusedField === "password" ? colors.primary : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.btnText}>Register Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: { flex: 1 },
  scrollContainer: { padding: 24, gap: 16 },
  errorBanner: { padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  inputWrap: { height: 52, borderRadius: 14, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, height: "100%", fontSize: 15, fontFamily: "Inter_400Regular" },
  passwordInput: { paddingRight: 8 },
  eyeBtn: { padding: 4 },
  submitBtn: { height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
```

---

## ⚙️ Generation Rules & Best Practices

1.  **Strictly Clean Email String Inputs**: Email addresses must always configure `autoCapitalize="none"`, `autoCorrect={false}`, and run `.trim()` filters before payload submittal to prevent DB queries failures.
2.  **Toggle Password visibility Contexts**: Include visibility toggles inside password fields to assist usability while preventing authentication failures.
3.  **Keyboard Gatekeepers**: Inputs must always be wrapped in a `<KeyboardAvoidingView>` matching the host platform (`behavior` configured as `padding` for iOS and `height` or undefined for Android) to prevent layouts from breaking.

---

## 📈 Scalability Notes

*   **Offline Validation Check**: Perform lightweight structural checks (email pattern regexes, minimal character counts) on the client side before triggering network calls, avoiding redundant DB queries.
*   **Prevent Double Submissions**: Explicitly disable submit triggers (`disabled={loading}`) and swap labels for active spinners (`<ActivityIndicator size="small" />`) while server-side tasks compile.
