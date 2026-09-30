import { StyleSheet, Text } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from './Card';
import { IconCircle } from './IconCircle';
import type { BadgeTone } from './Badge';
import { FontFamily, Spacing } from '@/constants/Theme';

type StatTileProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  tone: BadgeTone;
};

export function StatTile({ icon, value, label, tone }: StatTileProps) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <IconCircle name={icon} tone={tone} size={34} />
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={2}>
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, alignItems: 'flex-start', gap: 6, padding: Spacing.md },
  value: { fontFamily: FontFamily.bold, fontSize: 16.5, marginTop: 2, width: '100%' },
  label: { fontSize: 10.5, lineHeight: 13 },
});
