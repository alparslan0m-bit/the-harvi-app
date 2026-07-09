// Shared constants for purchase components — extracted from PurchaseScreen.tsx
import { TouchableOpacity } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";

export const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const SPRING_CONFIG = { damping: 15, stiffness: 150 };
