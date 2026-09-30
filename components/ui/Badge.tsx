import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'info' | 'danger' | 'muted';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function Badge({ label, tone = 'brand', icon }: BadgeProps) {
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
    <View style={[styles.badge, { backgroundColor: color + '1A' }]}>
      {icon ? <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
  },
});
