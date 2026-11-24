import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Spacing, Type } from '@/constants/Theme';
import type { Renovacion } from '@/lib/renovacion';

// Lo que se ve al volver del pago de la renovación:
//  - ya está al día → "¡Listo!", con palomita y vibración: que pase su tarjeta;
//  - pagó en efectivo en tienda → su ficha; al pagarla, pasa su tarjeta;
//  - el pago todavía se está confirmando → espera.
// La puerta no se abre sola al pagar: siempre se vuelve a pasar la tarjeta.
export function ResultadoRenovacion({
  datos,
  metodo,
  orderId,
  confirmando,
}: {
  datos: Renovacion;
  metodo?: string;
  orderId?: string;
  confirmando: boolean;
}) {
  const { colors, brand } = useTheme();

  if (metodo === 'paynet') {
    return (
      <View style={styles.caja}>
        <Icono nombre="receipt" color={brand.warning} />
        <Text style={[Type.title, styles.centro, { color: colors.text }]}>Tu ficha está lista</Text>
        <Text style={[Type.body, styles.centro, { color: colors.textSecondary }]}>
          Paga la ficha en la tienda: tu membresía se renueva en cuanto se registre el pago y después pasas tu tarjeta
          en la puerta.
        </Text>
        {orderId ? (
          <PrimaryButton label="Ver ficha de pago" icon="barcode-outline" onPress={() => router.replace({ pathname: '/pedido/[orderId]', params: { orderId } })} />
        ) : null}
      </View>
    );
  }

  if (!datos.vencida) {
    return <Listo titulo="¡Listo! Tu membresía está renovada" texto="Vuelve a pasar tu tarjeta en la puerta para entrar." />;
  }

  return (
    <View style={styles.caja}>
      {confirmando ? <ActivityIndicator color={brand.primary} size="large" /> : <Icono nombre="time" color={brand.warning} />}
      <Text style={[Type.title, styles.centro, { color: colors.text }]}>
        {confirmando ? 'Confirmando tu pago…' : 'Tu pago se está confirmando'}
      </Text>
      <Text style={[Type.body, styles.centro, { color: colors.textSecondary }]}>
        {confirmando
          ? 'En cuanto se confirme, pasa tu tarjeta en la puerta.'
          : 'Si ya te cobraron, desliza hacia abajo para revisar otra vez o pregunta en recepción.'}
      </Text>
    </View>
  );
}

function Listo({ titulo, texto }: { titulo: string; texto: string }) {
  const { colors, brand } = useTheme();
  const reducir = useReducedMotion();
  const escala = useSharedValue(reducir ? 1 : 0.4);

  // La palomita entra con un resorte y una vibración de éxito, al mismo tiempo.
  useEffect(() => {
    escala.value = withSpring(1, { damping: 12, stiffness: 180 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [escala]);

  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));

  return (
    <View style={styles.caja} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.palomita, { backgroundColor: brand.success }, estilo]}>
        <Ionicons name="checkmark" size={64} color="#FFFFFF" />
      </Animated.View>
      <Text style={[Type.largeTitle, styles.centro, { color: colors.text }]}>{titulo}</Text>
      <Text style={[Type.body, styles.centro, { color: colors.textSecondary }]}>{texto}</Text>
      <PrimaryButton label="Ir a Inicio" icon="home-outline" variant="outline" onPress={() => router.navigate('/(tabs)')} />
    </View>
  );
}

function Icono({ nombre, color }: { nombre: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <View style={[styles.icono, { backgroundColor: color + '1F' }]}>
      <Ionicons name={nombre} size={44} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xxl },
  centro: { textAlign: 'center' },
  palomita: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  icono: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
