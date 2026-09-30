import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import type { BadgeTone } from './Badge';

type IconCircleProps = {
  name: keyof typeof Ionicons.glyphMap;
  tone?: BadgeTone;
  size?: number;
};

export function IconCircle({ name, tone = 'brand', size = 48 }: IconCircleProps) {
  const { brand, colors } = useTheme();

  const toneColor: Record<BadgeTone, string> = {
    brand: brand.primary,
    success: brand.success,
    warning: brand.warning,
    info: brand.info,
    danger: brand.danger,
    muted: colors.textSecondary,
  };
  const color = toneColor[tone];

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1F' },
      ]}>
      <Ionicons name={name} size={size * 0.46} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
