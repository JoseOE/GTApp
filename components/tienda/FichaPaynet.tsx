import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ImagenProtegida } from '@/components/ui/ImagenProtegida';
import { FilaLogos, type Logo } from '@/components/checkout/LogoPago';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { dinero, fechaLarga } from '@/lib/formato';
import { rutaCodigoPaynet } from '@/lib/recibos';
import type { Pedido } from '@/lib/tienda';

// Tiendas donde se paga la ficha (simulador tipo Paynet).
export const TIENDAS_EFECTIVO: Logo[] = ['oxxo', '7-eleven', 'walmart', 'bodega-aurrera', 'farmacias-del-ahorro', 'circle-k'];

// Pedido pendiente de pago en efectivo: el código de barras, la referencia
// para dictarla en caja, el monto y la fecha límite (72 h).
export function FichaPaynet({ pedido }: { pedido: Pedido }) {
  const { colors, brand } = useTheme();
  const ficha = pedido.paynet;
  if (!ficha || pedido.estado !== 'pendiente_pago') return null;

  async function copiar() {
    await Clipboard.setStringAsync(ficha!.referencia.replace(/\s/g, ''));
    Alert.alert('Referencia copiada', ficha!.referencia);
  }

  return (
    <Card style={styles.caja}>
      <Text style={[styles.titulo, { color: colors.text }]}>Paga en efectivo en tienda</Text>
      <Text style={[styles.texto, { color: colors.textSecondary }]}>
        Muestra este código en caja o dicta la referencia. Tu pedido se confirma en cuanto se registra el pago.
      </Text>

      <View style={styles.codigoMarco}>
        <ImagenProtegida ruta={rutaCodigoPaynet(pedido.orderId)} style={styles.codigo} accessibilityLabel="Código de barras de la ficha de pago" />
      </View>

      <AnimatedPressable onPress={copiar} haptic={false} style={[styles.referencia, { borderColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Referencia</Text>
          <Text style={[styles.referenciaTexto, { color: colors.text }]} selectable>
            {ficha.referencia}
          </Text>
        </View>
        <Ionicons name="copy-outline" size={20} color={brand.primaryDark} />
      </AnimatedPressable>

      <View style={styles.datos}>
        <View>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Monto a pagar</Text>
          <Text style={[styles.monto, { color: colors.text }]}>{dinero(pedido.total)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', flex: 1 }}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Fecha límite</Text>
          <Text style={[styles.vence, { color: brand.danger }]}>{fechaLarga(ficha.vence, true)}</Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: colors.textSecondary }]}>Págala en:</Text>
      <FilaLogos logos={TIENDAS_EFECTIVO} alto={22} />
    </Card>
  );
}

const styles = StyleSheet.create({
  caja: { gap: Spacing.md },
  titulo: { fontFamily: FontFamily.bold, fontSize: 17 },
  texto: { fontSize: 13, lineHeight: 18 },
  codigoMarco: { backgroundColor: '#FFFFFF', borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  codigo: { width: '100%', height: 90 },
  referencia: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  referenciaTexto: { fontFamily: FontFamily.bold, fontSize: 17, letterSpacing: 1 },
  datos: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  monto: { fontFamily: FontFamily.bold, fontSize: 18 },
  vence: { fontFamily: FontFamily.semiBold, fontSize: 13, textAlign: 'right' },
  meta: { fontSize: 12 },
});
