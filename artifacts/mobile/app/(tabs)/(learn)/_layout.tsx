import { Stack } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function LearnStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        animation: "slide_from_right",
      }}
    />
  );
}
