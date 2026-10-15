import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from './AnimatedPressable';
import { IconCircle } from './IconCircle';
import { FontFamily, Spacing } from '@/constants/Theme';

// Fila de menú con ícono, texto y flecha (Mi cuenta, Mis pedidos...).
export function ListRow({
  icon,
  label,
  hint,
  onPress,
  bordered,
  danger,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint?: string;
  onPress: () => void;
  bordered?: boolean;
  danger?: boolean;
}) {
  const { colors, brand } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      haptic={false}
      style={[styles.row, bordered && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <IconCircle name={icon} tone={danger ? 'danger' : 'brand'} size={38} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? brand.danger : colors.text }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: colors.textSecondary }]}>{hint}</Text> : null}
      </View>
      {danger ? null : <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  rowLabel: { fontFamily: FontFamily.medium, fontSize: 14.5 },
  rowHint: { fontSize: 12, marginTop: 1 },
});
