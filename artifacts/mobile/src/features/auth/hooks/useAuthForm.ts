import * as Haptics from "expo-haptics";
import { router, Href } from "expo-router";
import { useState } from "react";

import { useAuth } from "@/src/shared/store/authStore";

export function useAuthForm() {
  const signIn = useAuth((s) => s.signIn);
  const signUp = useAuth((s) => s.signUp);
  const signInWithGoogle = useAuth((s) => s.signInWithGoogle);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const fn = mode === "login" ? signIn : signUp;
    const { error: err } = await fn(email.trim(), password);

    if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)" as Href);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error: err, cancelled } = await signInWithGoogle();

    setGoogleLoading(false);
    if (cancelled) {
      return; // User aborted the flow — do nothing
    } else if (err) {
      setError(err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      router.replace("/(tabs)" as Href);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError(null);
  };

  return {
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
  };
}
