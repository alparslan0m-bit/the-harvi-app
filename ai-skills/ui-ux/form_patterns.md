# Form Design Patterns: Inputs & Validation Layouts

This document defines the interface standards, state integrations, and validation error layouts for all user forms in the Harvi workspace.

---

## 1. Focused-State Dynamic Borders

To achieve a premium, interactive feel, input fields inside Harvi dynamically adjust their borders and icons when focused. Instead of simple inputs, fields are wrapped inside interactive cards that monitor focus:

```tsx
// Example extracted from app/auth.tsx
const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

<View
  style={[
    styles.inputWrap,
    { 
      // Dynamic color shift on focus
      borderColor: focusedField === "email" ? colors.primary : colors.border, 
      backgroundColor: colors.card,
      // Thickness increases slightly when focused to emphasize selection
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
    placeholder="Email address"
    placeholderTextColor={colors.mutedForeground}
    value={email}
    onChangeText={setEmail}
    onFocus={() => setFocusedField("email")}
    onBlur={() => setFocusedField(null)}
  />
</View>
```

---

## 2. Password Visibility Toggle

Password input containers must contain an explicit visibility toggle trigger that enables users to preview characters before submitting:

```tsx
const [showPassword, setShowPassword] = useState(false);

<View
  style={[
    styles.inputWrap,
    { 
      borderColor: focusedField === "password" ? colors.primary : colors.border, 
      backgroundColor: colors.card,
      borderWidth: focusedField === "password" ? 2 : 1,
    },
  ]}
>
  <Feather name="lock" size={18} color={focusedField === "password" ? colors.primary : colors.mutedForeground} />
  <TextInput
    style={[styles.input, { color: colors.foreground }]}
    placeholder="Password"
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
    onFocus={() => setFocusedField("password")}
    onBlur={() => setFocusedField(null)}
  />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    <Feather
      name={showPassword ? "eye-off" : "eye"}
      size={18}
      color={focusedField === "password" ? colors.primary : colors.mutedForeground}
    />
  </TouchableOpacity>
</View>
```

---

## 3. Standardized Validation Error Banners

When a form submission fails or input is missing, the error is presented in a prominent, highly styled notification banner rather than basic native alerts:

```tsx
{error && (
  <View
    style={[
      styles.errorBox,
      { 
        // 10% opacity background of the destructive red color
        backgroundColor: colors.destructive + "1A", 
        // 20% opacity border of the destructive red color
        borderColor: colors.destructive + "33" 
      },
    ]}
  >
    <Feather name="alert-circle" size={14} color={colors.destructive} />
    <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
  </View>
)}
```

---

## 4. Input Rules & Layout Conventions

1.  **Strict Auto-Capitalization Management**: Ensure all email fields set `autoCapitalize="none"`, `autoCorrect={false}`, and run a `.trim()` check before parsing inputs to prevent database query failures.
2.  **Explicit Button Disabling**: When a form is actively processing, set the main action button `disabled={loading}` and swap text outputs for `<ActivityIndicator size="small" />` to prevent duplicate database submissions.
3.  **Keyboard Avoidance Setup**: Forms must be wrapped inside a `<KeyboardAvoidingView>` matching the active system layout:
    ```tsx
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        {/* Form Contents */}
      </ScrollView>
    </KeyboardAvoidingView>
    ```
