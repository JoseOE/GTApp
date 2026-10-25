import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Spacing } from '@/constants/Theme';

// Tarjeta con Stripe Checkout: al confirmar se abre la página de pago de
// Stripe. La tarjeta se escribe ahí y nunca pasa por la app ni por GymTrack.
export function MetodoTarjeta() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.fila}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.text} />
        <Text style={[styles.texto, { color: colors.text }]}>
          Al confirmar te llevamos a la página segura de <Text style={styles.fuerte}>Stripe</Text> para pagar con tu tarjeta.
          Al terminar vuelves aquí y tu pedido queda pagado.
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        Modo de prueba: usa la tarjeta 4242 4242 4242 4242, cualquier fecha futura y cualquier CVC.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  texto: { flex: 1, fontSize: 13, lineHeight: 18 },
  fuerte: { fontFamily: FontFamily.semiBold },
  meta: { fontSize: 12, lineHeight: 16 },
});
