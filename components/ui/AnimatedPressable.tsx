import { type PropsWithChildren } from 'react';
import { Pressable, type PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = PropsWithChildren<
  Omit<PressableProps, 'style'> & {
    style?: StyleProp<ViewStyle>;
    scaleTo?: number;
    haptic?: boolean;
  }
>;

/**
 * Spring-based press feedback shared by every tappable surface in the app
 * (buttons, cards, list rows) so the "settle" feel is consistent everywhere,
 * with an optional light haptic tick — the native equivalent of the
 * magnetic/press micro-interactions used on the web buttons.
 *
 * La vibración va apagada por defecto: si todo vibra, deja de significar algo.
 * Se pide (haptic) solo en las acciones que importan, como el botón principal.
 */
export function AnimatedPressable({
  children,
  style,
  scaleTo = 0.96,
  haptic = false,
  onPressIn,
  onPressOut,
  ...rest
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressableBase
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, { damping: 16, stiffness: 260 });
        if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        onPressOut?.(e);
      }}
      {...rest}>
      {children}
    </AnimatedPressableBase>
  );
}
