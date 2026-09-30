import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

type RevealProps = PropsWithChildren<{
  index?: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Staggered mount-in used across screens — the native counterpart to the
 * web dashboard's .card-animate/.stagger-N pattern, one authored moment
 * rather than a different entrance per screen.
 */
export function Reveal({ index = 0, style, children }: RevealProps) {
  return (
    <Animated.View
      entering={FadeInUp.delay(index * 70)
        .springify()
        .damping(17)
        .stiffness(140)}
      style={style}>
      {children}
    </Animated.View>
  );
}
