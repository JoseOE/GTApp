import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily } from '@/constants/Theme';

export const COLOR_ESTRELLA = '#F5A524';

// Estrellas de 0 a 5 con medias estrellas: 4.3 → ★★★★☆, 4.6 → ★★★★½.
export function Estrellas({
  promedio,
  total,
  size = 14,
  conNumero = true,
}: {
  promedio: number;
  total?: number;
  size?: number;
  conNumero?: boolean;
}) {
  const { colors } = useTheme();
  const redondeado = Math.round(promedio * 2) / 2;
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${promedio.toFixed(1)} de 5 estrellas${total != null ? `, ${total} ${total === 1 ? 'reseña' : 'reseñas'}` : ''}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={redondeado >= n ? 'star' : redondeado >= n - 0.5 ? 'star-half' : 'star-outline'}
          size={size}
          color={COLOR_ESTRELLA}
        />
      ))}
      {conNumero ? (
        <Text style={[styles.numero, { color: colors.textSecondary, fontSize: size * 0.85 }]}>
          {promedio.toFixed(1)}
          {total != null ? ` (${total})` : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  numero: { fontFamily: FontFamily.medium, marginLeft: 4 },
});
