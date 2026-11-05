import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from './Card';
import type { BadgeTone } from './Badge';
import { Spacing, Type } from '@/constants/Theme';

type StatTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone: BadgeTone;
  // Unidad pequeña junto al número ("kg", "días").
  unidad?: string;
};

// Cifra deportiva: el número manda (grande y grueso) y la etiqueta lo explica.
// El ícono es pequeño y solo él lleva el color del tono.
export function StatTile({ icon, value, label, tone, unidad }: StatTileProps) {
  const { colors, brand } = useTheme();
  const color: Record<BadgeTone, string> = {
    brand: brand.primary,
    success: brand.success,
    warning: brand.warning,
    info: brand.info,
    danger: brand.danger,
    muted: colors.textSecondary,
  };
  return (
    <Card style={styles.tile} elevated={false}>
      <Ionicons name={icon} size={18} color={color[tone]} />
      <View style={styles.cifra}>
        <Text style={[Type.stat, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {unidad ? <Text style={[Type.caption, { color: colors.textSecondary }]}>{unidad}</Text> : null}
      </View>
      <Text style={[Type.caption, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'flex-start', gap: 2, padding: Spacing.md },
  cifra: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: Spacing.xs },
});
