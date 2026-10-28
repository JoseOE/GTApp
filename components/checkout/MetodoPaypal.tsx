import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { fetchModoPagos, type SimulacionPaypal } from '@/lib/tienda';

const AZUL_PAYPAL = '#003087';

const OPCIONES: { id: SimulacionPaypal; texto: string }[] = [
  { id: 'aprobado', texto: 'Aprobado' },
  { id: 'sin_fondos', texto: 'Sin fondos' },
  { id: 'cuenta_invalida', texto: 'Cuenta inválida o vencida' },
];

// PayPal: al confirmar se abre la página de PayPal para aprobar el pago; al
// aprobar, el navegador vuelve a la app y se completa la compra.
//
// En pruebas (el servidor dice simularPaypal) se puede elegir cómo responde
// PayPal al cobrar: aprobado, sin fondos o con una cuenta que no puede pagar.
// Con un rechazo, PayPal no cobra y no se crea el pedido.
export function MetodoPaypal({
  simular,
  onSimular,
}: {
  simular: SimulacionPaypal;
  onSimular: (s: SimulacionPaypal) => void;
}) {
  const { colors, brand } = useTheme();
  const [simulable, setSimulable] = useState(false);

  useEffect(() => {
    fetchModoPagos()
      .then((m) => setSimulable(!!m.simularPaypal))
      .catch(() => setSimulable(false));
  }, []);

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

      {simulable ? (
        <View style={[styles.simular, { borderColor: brand.warning, backgroundColor: brand.warning + '14' }]}>
          <Text style={[styles.simularTitulo, { color: colors.text }]}>Simular el resultado de PayPal</Text>
          <View style={styles.opciones} accessibilityRole="radiogroup">
            {OPCIONES.map((o) => {
              const activa = simular === o.id;
              return (
                <AnimatedPressable
                  key={o.id}
                  onPress={() => onSimular(o.id)}
                  haptic={false}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activa }}
                  style={[
                    styles.opcion,
                    { borderColor: activa ? brand.primary : colors.border, backgroundColor: activa ? brand.primary + '1A' : colors.surface },
                  ]}>
                  <Text style={[styles.opcionTexto, { color: activa ? brand.primary : colors.text }]}>{o.texto}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Apruebas en PayPal como siempre; con un rechazo, PayPal no cobra y no se crea el pedido.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  texto: { flex: 1, fontSize: 13, lineHeight: 18 },
  meta: { fontSize: 12, lineHeight: 16 },
  simular: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm, marginTop: Spacing.xs },
  simularTitulo: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  opcion: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  opcionTexto: { fontFamily: FontFamily.medium, fontSize: 12.5 },
});
