import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useEntrenamiento } from '@/lib/EntrenamientoContext';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { reloj, siguientePendiente } from '@/lib/entrenamiento';
import { useAhora } from './Contador';

// Píldora sobre las pestañas mientras hay un entrenamiento en curso: el tiempo
// y lo que sigue; al tocarla vuelves al entrenamiento.
export function BarraEntrenamiento() {
  const { brand, onPrimary } = useTheme();
  const { sesion } = useEntrenamiento();
  const insets = useSafeAreaInsets();
  const reducir = useReducedMotion();
  const ahora = useAhora(!!sesion);
  if (!sesion) return null;

  const sig = siguientePendiente(sesion);
  const enDescanso = sesion.descanso && sesion.descanso.hasta > ahora;
  const detalle = enDescanso
    ? `Descanso ${reloj(Math.ceil((sesion.descanso!.hasta - ahora) / 1000))}`
    : sig
      ? sesion.ejercicios[sig.e].nombre
      : 'Todas las series hechas';

  return (
    <Animated.View
      entering={reducir ? undefined : SlideInDown.springify().damping(20)}
      exiting={reducir ? undefined : SlideOutDown.duration(180)}
      style={[styles.contenedor, { bottom: insets.bottom + 62 }]}
      pointerEvents="box-none">
      <AnimatedPressable
        onPress={() => router.push('/entrenando')}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel="Volver al entrenamiento en curso"
        style={[styles.barra, { backgroundColor: brand.primary }]}>
        <Ionicons name="barbell" size={20} color={onPrimary} />
        <View style={{ flex: 1 }}>
          <Text style={[Type.callout, { color: onPrimary }]} numberOfLines={1}>
            {sesion.nombre} · {reloj((ahora - sesion.inicio) / 1000)}
          </Text>
          <Text style={[Type.caption, { color: onPrimary, opacity: 0.85 }]} numberOfLines={1}>
            {detalle}
          </Text>
        </View>
        <Ionicons name="chevron-up" size={20} color={onPrimary} />
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 50 },
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
});
