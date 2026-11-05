import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from './AnimatedPressable';
import { Radius, Spacing, Type } from '@/constants/Theme';

// Lista agrupada al estilo de Ajustes de iOS: un rótulo pequeño, un bloque
// redondeado con filas separadas por una línea fina y, si hace falta, una nota.
export function Grupo({ titulo, nota, children }: { titulo?: string; nota?: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: Spacing.xs }}>
      {titulo ? <Text style={[Type.overline, styles.titulo, { color: colors.textSecondary }]}>{titulo}</Text> : null}
      <View style={[styles.bloque, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
      {nota ? <Text style={[Type.caption, styles.nota, { color: colors.textSecondary }]}>{nota}</Text> : null}
    </View>
  );
}

// Una fila: ícono gris, etiqueta y valor. Con onPress lleva flecha (o el
// ícono de acción que se pida, como el de llamar o abrir el mapa).
export function FilaDato({
  icon,
  etiqueta,
  valor,
  onPress,
  accion = 'chevron-forward',
  ultima,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  etiqueta: string;
  valor?: string | null;
  onPress?: () => void;
  accion?: keyof typeof Ionicons.glyphMap;
  ultima?: boolean;
}) {
  const { colors, brand } = useTheme();
  const contenido = (
    <View style={[styles.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.textSecondary} style={styles.icono} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>{etiqueta}</Text>
        {valor ? <Text style={[Type.body, { color: colors.text }]}>{valor}</Text> : null}
      </View>
      {onPress ? <Ionicons name={accion} size={18} color={accion === 'chevron-forward' ? colors.textSecondary : brand.primaryDark} /> : null}
    </View>
  );
  if (!onPress) return contenido;
  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={`${etiqueta}${valor ? `: ${valor}` : ''}`}>
      {contenido}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  titulo: { marginLeft: Spacing.lg, textTransform: 'uppercase' },
  bloque: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  nota: { marginHorizontal: Spacing.lg },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  icono: { width: 22, textAlign: 'center' },
});
