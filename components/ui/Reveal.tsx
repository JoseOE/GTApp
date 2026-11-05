import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

type RevealProps = PropsWithChildren<{
  index?: number;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Staggered mount-in used across screens — the native counterpart to the
 * web dashboard's .card-animate/.stagger-N pattern, one authored moment
 * rather than a different entrance per screen.
 *
 * Con "Reducir movimiento" activado en el teléfono, aparece sin desplazarse.
 * El escalonado es corto (40 ms) y se detiene en el quinto elemento, para que
 * la pantalla no tarde en estar completa.
 */
export function Reveal({ index = 0, style, children }: RevealProps) {
  const reducir = useReducedMotion();
  if (reducir) return <View style={style}>{children}</View>;
  return (
    <Animated.View
      entering={FadeInUp.delay(Math.min(index, 5) * 40)
        .springify()
        .damping(20)
        .stiffness(170)}
      style={style}>
      {children}
    </Animated.View>
  );
}
