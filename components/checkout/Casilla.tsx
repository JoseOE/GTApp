import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Spacing } from '@/constants/Theme';

// Casilla de "acepto": el texto puede llevar enlaces que se tocan aparte.
export function Casilla({
  marcada,
  onCambio,
  etiqueta,
  children,
}: {
  marcada: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
  children: ReactNode;
}) {
  const { colors, brand } = useTheme();
  return (
    <View style={styles.fila}>
      <AnimatedPressable
        onPress={() => onCambio(!marcada)}
        hitSlop={10}
        scaleTo={0.85}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: marcada }}
        accessibilityLabel={etiqueta}>
        <Ionicons name={marcada ? 'checkbox' : 'square-outline'} size={24} color={marcada ? brand.primary : colors.textSecondary} />
      </AnimatedPressable>
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
});
