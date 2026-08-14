/**
 * @file KeyboardAwareScrollViewCompat.tsx
 * @description Cross-platform keyboard-aware scroll container.
 * Delegates to `react-native-keyboard-controller`'s `KeyboardAwareScrollView` on native platforms (iOS & Android)
 * to prevent software keyboards from obscuring active text inputs, and gracefully falls back to standard `ScrollView` on Web.
 */
import {
  KeyboardAwareScrollView,
  KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

/** Combined props interface supporting both KeyboardAwareScrollView and standard ScrollView attributes */
type Props = KeyboardAwareScrollViewProps & ScrollViewProps;

/**
 * Platform-compatible wrapper for scroll views containing editable form fields.
 * 
 * @param props - Props combining KeyboardAwareScrollView and ScrollView options
 * @returns Platform-appropriate scroll view element
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
