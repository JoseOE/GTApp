import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { dinero } from '@/lib/formato';
import type { Carrito } from '@/lib/tienda';

// Subtotal sin IVA, IVA 16 % y total, como en la web.
export function Desglose({ carrito }: { carrito: Pick<Carrito, 'subtotal' | 'iva' | 'total'> }) {
  const { colors } = useTheme();
  return (
    <Card style={{ gap: Spacing.sm }}>
      <Fila etiqueta="Subtotal (sin IVA)" valor={dinero(carrito.subtotal)} />
      <Fila etiqueta="IVA 16 %" valor={dinero(carrito.iva)} />
      <View style={[styles.divisor, { backgroundColor: colors.border }]} />
      <Fila etiqueta="Total" valor={dinero(carrito.total)} fuerte />
    </Card>
  );
}

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <Text style={[fuerte ? styles.filaFuerte : styles.filaTexto, { color: fuerte ? colors.text : colors.textSecondary }]}>
        {etiqueta}
      </Text>
      <Text style={[fuerte ? styles.filaFuerte : styles.filaTexto, { color: colors.text }]}>{valor}</Text>
    </View>
  );
}

export function Avisos({ avisos }: { avisos: string[] }) {
  const { colors, brand } = useTheme();
  return (
    <View style={[styles.avisos, { borderColor: brand.warning, backgroundColor: brand.warning + '14' }]}>
      <Ionicons name="information-circle-outline" size={18} color={brand.warning} />
      <View style={{ flex: 1, gap: 2 }}>
        {avisos.map((a) => (
          <Text key={a} style={[styles.avisoTexto, { color: colors.text }]}>
            {a}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', justifyContent: 'space-between' },
  filaTexto: { fontSize: 13.5 },
  filaFuerte: { fontFamily: FontFamily.bold, fontSize: 16 },
  divisor: { height: 1, marginVertical: Spacing.xs },
  avisos: { flexDirection: 'row', gap: Spacing.sm, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  avisoTexto: { fontSize: 12.5, lineHeight: 17 },
});
