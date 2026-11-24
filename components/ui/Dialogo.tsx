import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, Keyframe, useReducedMotion } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import { cerrarDialogo, suscribirDialogos, type BotonDialogo, type Dialogo } from '@/lib/dialogo';

// La ventana de avisos de GymTrack (ver lib/dialogo.ts): tarjeta centrada con
// un ícono en un círculo de color, el título, el mensaje y los botones uno
// debajo de otro (la acción principal arriba, "Cancelar" al final como texto).
// Lo que borra o descarta va en rojo. Tocar fuera equivale a "Cancelar".

// Una por ventana: reutilizar la misma entre avisos deja el segundo oculto en web.
function animacionDeEntrada() {
  return new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.94 }] },
    100: { opacity: 1, transform: [{ scale: 1 }] },
  }).duration(200);
}

export function DialogoHost() {
  const [cola, setCola] = useState<Dialogo[]>([]);
  useEffect(() => suscribirDialogos(setCola), []);
  const actual = cola[0];

  return (
    <Modal
      visible={!!actual}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => actual && cancelar(actual)}>
      {actual ? <Tarjeta key={actual.id} dialogo={actual} /> : null}
    </Modal>
  );
}

// Primero se cierra y luego se hace la acción: si la acción abre otro aviso
// (un error, por ejemplo), aparece después de este.
function presionar(d: Dialogo, b: BotonDialogo) {
  cerrarDialogo(d.id);
  b.onPress?.();
}

function cancelar(d: Dialogo) {
  const boton = d.botones.find((b) => b.style === 'cancel') ?? (d.botones.length === 1 ? d.botones[0] : null);
  if (boton) presionar(d, boton);
}

function Tarjeta({ dialogo }: { dialogo: Dialogo }) {
  const { colors, brand } = useTheme();
  const reducir = useReducedMotion();
  const [entra] = useState(animacionDeEntrada);
  const color = {
    marca: brand.primaryDark,
    peligro: brand.danger,
    exito: brand.success,
    aviso: brand.warning,
  }[dialogo.tono];

  useEffect(() => {
    if (dialogo.tono === 'peligro') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [dialogo.tono]);

  const acciones = dialogo.botones.filter((b) => b.style !== 'cancel');
  const cancelarBoton = dialogo.botones.find((b) => b.style === 'cancel');

  return (
    <View style={styles.contenedor}>
      <Animated.View entering={reducir ? undefined : FadeIn.duration(160)} style={StyleSheet.absoluteFill}>
        <Pressable
          style={[StyleSheet.absoluteFill, styles.fondo]}
          onPress={() => cancelar(dialogo)}
          accessibilityRole="button"
          accessibilityLabel={cancelarBoton ? cancelarBoton.text : 'Cerrar'}
        />
      </Animated.View>

      <Animated.View
        entering={reducir ? undefined : entra}
        style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
        accessibilityViewIsModal
        accessibilityRole="alert">
        <View style={[styles.icono, { backgroundColor: color + '1F' }]}>
          <Ionicons name={dialogo.icono} size={28} color={color} />
        </View>
        <Text style={[styles.titulo, { color: colors.text }]}>{dialogo.titulo}</Text>
        {dialogo.mensaje ? (
          <Text style={[Type.body, styles.mensaje, { color: colors.textSecondary }]}>{dialogo.mensaje}</Text>
        ) : null}

        <View style={styles.botones}>
          {acciones.map((b, i) =>
            b.style === 'destructive' ? (
              <AnimatedPressable
                key={b.text}
                onPress={() => presionar(dialogo, b)}
                scaleTo={0.96}
                accessibilityRole="button"
                style={[styles.peligro, { backgroundColor: brand.danger }]}>
                <Text style={styles.peligroTexto}>{b.text}</Text>
              </AnimatedPressable>
            ) : i === 0 ? (
              <PrimaryButton key={b.text} label={b.text} onPress={() => presionar(dialogo, b)} />
            ) : (
              <PrimaryButton key={b.text} label={b.text} variant="outline" onPress={() => presionar(dialogo, b)} />
            )
          )}
          {cancelarBoton ? (
            <AnimatedPressable
              onPress={() => presionar(dialogo, cancelarBoton)}
              scaleTo={0.96}
              accessibilityRole="button"
              style={styles.cancelar}>
              <Text style={[styles.cancelarTexto, { color: colors.text }]}>{cancelarBoton.text}</Text>
            </AnimatedPressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  fondo: { backgroundColor: 'rgba(8, 8, 10, 0.55)' },
  tarjeta: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  icono: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  titulo: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  mensaje: { textAlign: 'center', marginTop: Spacing.sm },
  botones: { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.xl },
  peligro: {
    borderRadius: Radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peligroTexto: { fontFamily: FontFamily.semiBold, fontSize: 15.5, color: '#FFFFFF' },
  cancelar: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: Radius.pill },
  cancelarTexto: { fontFamily: FontFamily.semiBold, fontSize: 15.5 },
});
