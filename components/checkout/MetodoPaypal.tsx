import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Casilla } from './Casilla';
import { LogoPago } from './LogoPago';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import type { VinculoPaypal } from '@/lib/tienda';

const AZUL_PAYPAL = '#003087';

// PayPal: con la cuenta vinculada se paga con solo confirmar; si no, se abre
// la página del simulador para aprobar con una cuenta de prueba.
export function MetodoPaypal({
  vinculo,
  usarVinculo,
  onUsarVinculo,
  recordar,
  onRecordar,
}: {
  vinculo: VinculoPaypal | null;
  usarVinculo: boolean;
  onUsarVinculo: (v: boolean) => void;
  recordar: boolean;
  onRecordar: (v: boolean) => void;
}) {
  const { colors, brand } = useTheme();
  const vinculada = !!vinculo?.vinculada;

  if (vinculada && usarVinculo) {
    return (
      <View style={{ gap: Spacing.md }}>
        <View style={[styles.vinculada, { borderColor: AZUL_PAYPAL }]}>
          <LogoPago nombre="paypal" alto={24} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.titulo, { color: colors.text }]}>Cuenta vinculada · {vinculo?.cuenta}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Pagas con solo confirmar, sin salir de la app.</Text>
          </View>
        </View>
        <AnimatedPressable onPress={() => onUsarVinculo(false)} haptic={false} style={styles.enlaceFila}>
          <Ionicons name="swap-horizontal" size={16} color={brand.primaryDark} />
          <Text style={[styles.enlace, { color: brand.primaryDark }]}>Usar otra cuenta</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={styles.fila}>
        <Ionicons name="open-outline" size={18} color={AZUL_PAYPAL} />
        <Text style={[styles.texto, { color: colors.text }]}>
          Al confirmar te llevamos a PayPal para aprobar el pago con una cuenta de prueba (no pide contraseña). Al aprobar,
          vuelves aquí y se completa tu compra.
        </Text>
      </View>
      <Casilla marcada={recordar} onCambio={onRecordar} etiqueta="Recordar mi cuenta PayPal">
        <Text style={[styles.titulo, { color: colors.text }]}>Recordar mi cuenta PayPal</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          La próxima vez pagas con solo confirmar. No guardamos tu contraseña ni tu tarjeta; la desvinculas en Mi cuenta.
        </Text>
      </Casilla>
      {vinculada ? (
        <AnimatedPressable onPress={() => onUsarVinculo(true)} haptic={false} style={styles.enlaceFila}>
          <Ionicons name="link-outline" size={16} color={brand.primaryDark} />
          <Text style={[styles.enlace, { color: brand.primaryDark }]}>Usar mi cuenta vinculada ({vinculo?.cuenta})</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vinculada: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  titulo: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  meta: { fontSize: 12, lineHeight: 16 },
  texto: { flex: 1, fontSize: 13, lineHeight: 18 },
  fila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  enlaceFila: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  enlace: { fontFamily: FontFamily.semiBold, fontSize: 13 },
});
