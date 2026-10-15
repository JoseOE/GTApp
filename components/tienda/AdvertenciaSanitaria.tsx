import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';

// Leyenda de los suplementos alimenticios, la misma de la tienda web
// (checkout.html y terminos.html#suplementos de GTWeb).
export const LEYENDA_SUPLEMENTO =
  'Este producto no es un medicamento. El consumo de este producto es responsabilidad de quien lo recomienda y de quien lo usa.';

export const RECOMENDACIONES_SUPLEMENTO = [
  'Consulta a tu médico antes de consumirlo, sobre todo si tienes alguna enfermedad, presión alta o problemas del corazón.',
  'No se recomienda durante el embarazo ni la lactancia, ni para menores de 18 años.',
  'Respeta la porción indicada en la etiqueta.',
];

export function AdvertenciaSanitaria() {
  const { colors, brand } = useTheme();
  return (
    <View style={[styles.caja, { borderColor: brand.warning, backgroundColor: brand.warning + '14' }]}>
      <View style={styles.titulo}>
        <Ionicons name="warning-outline" size={18} color={brand.warning} />
        <Text style={[styles.tituloTexto, { color: colors.text }]}>Advertencia sanitaria</Text>
      </View>
      <Text style={[styles.leyenda, { color: colors.text }]}>{LEYENDA_SUPLEMENTO}</Text>
      {RECOMENDACIONES_SUPLEMENTO.map((r) => (
        <Text key={r} style={[styles.punto, { color: colors.textSecondary }]}>
          • {r}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.xs },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  tituloTexto: { fontFamily: FontFamily.semiBold, fontSize: 14.5 },
  leyenda: { fontFamily: FontFamily.semiBold, fontSize: 13, lineHeight: 18 },
  punto: { fontSize: 12.5, lineHeight: 17 },
});
