import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeOutUp, SlideInUp, useReducedMotion, FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Radius, Spacing, Type } from '@/constants/Theme';

// Aviso dentro de la app cuando llega el push de membresía vencida con la app
// abierta: baja desde arriba, como una notificación, con "Renovar ahora".
export function AvisoRenovacion({
  titulo,
  texto,
  onRenovar,
  onCerrar,
}: {
  titulo: string;
  texto: string;
  onRenovar: () => void;
  onCerrar: () => void;
}) {
  const { brand, onPrimary } = useTheme();
  const insets = useSafeAreaInsets();
  const reducir = useReducedMotion();

  return (
    <Animated.View
      entering={reducir ? FadeIn.duration(200) : SlideInUp.springify().damping(20).stiffness(180)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.contenedor, { top: insets.top + Spacing.sm }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive">
      <View style={styles.tarjeta}>
        <View style={styles.cabeza}>
          <View style={[styles.icono, { backgroundColor: brand.warning + '33' }]}>
            <Ionicons name="card" size={18} color={brand.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[Type.headline, styles.claro]} numberOfLines={1}>
              {titulo || 'Tu membresía venció'}
            </Text>
            <Text style={[Type.footnote, styles.tenue]} numberOfLines={3}>
              {texto}
            </Text>
          </View>
          <AnimatedPressable onPress={onCerrar} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar aviso">
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </AnimatedPressable>
        </View>
        <AnimatedPressable
          onPress={onRenovar}
          haptic
          scaleTo={0.97}
          accessibilityRole="button"
          style={[styles.boton, { backgroundColor: brand.primary }]}>
          <Text style={[Type.callout, { color: onPrimary }]}>Renovar ahora</Text>
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 200 },
  tarjeta: {
    backgroundColor: '#141417',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  icono: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  claro: { color: '#FFFFFF' },
  tenue: { color: 'rgba(255,255,255,0.7)' },
  boton: { borderRadius: Radius.pill, paddingVertical: 11, alignItems: 'center' },
});
