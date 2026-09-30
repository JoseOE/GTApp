import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

type AnimatedTabIconProps = {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  focused: boolean;
  size?: number;
};

export function AnimatedTabIcon({ name, color, focused, size = 23 }: AnimatedTabIconProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.14 : 1, { damping: 10, stiffness: 220 });
  }, [focused]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
