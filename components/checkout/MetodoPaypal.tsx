import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Spacing } from '@/constants/Theme';

const AZUL_PAYPAL = '#003087';

// PayPal: al confirmar se abre la página de PayPal para aprobar el pago; al
// aprobar, el navegador vuelve a la app y se completa la compra.
export function MetodoPaypal() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.fila}>
        <Ionicons name="open-outline" size={18} color={AZUL_PAYPAL} />
        <Text style={[styles.texto, { color: colors.text }]}>
          Al confirmar te llevamos a PayPal para aprobar el pago. Al aprobar, vuelves aquí y se completa tu compra.
        </Text>
      </View>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        Modo de prueba: entra con una cuenta compradora de prueba de PayPal (sandbox), no con tu cuenta real.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  texto: { flex: 1, fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 12, lineHeight: 16 },
});
