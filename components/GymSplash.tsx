import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily } from '@/constants/Theme';
import { foregroundFor } from '@/lib/color';

type GymSplashProps = {
  logo?: string | null;
  nombre: string;
  color?: string | null;
  onDone: () => void;
};

// Bienvenida de marca del gimnasio: su logo entra con un resorte sobre su color
// y da paso a la app. Se muestra una vez por arranque, no cada vez que navegas.
export function GymSplash({ logo, nombre, color, onDone }: GymSplashProps) {
  const { brand } = useTheme();
  const fondo = color || brand.primary;
  const textoSobreFondo = foregroundFor(fondo);

  const escala = useSharedValue(0.6);
  const opacidad = useSharedValue(0);
  const desplazamiento = useSharedValue(14);

  useEffect(() => {
    opacidad.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) });
    escala.value = withSequence(
      withSpring(1.06, { damping: 12, stiffness: 140 }),
      withSpring(1, { damping: 16, stiffness: 160 })
    );
    desplazamiento.value = withDelay(220, withSpring(0, { damping: 18, stiffness: 150 }));

    const salida = setTimeout(onDone, 1750);
    return () => clearTimeout(salida);
  }, [escala, opacidad, desplazamiento, onDone]);

  const estiloLogo = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ scale: escala.value }],
  }));

  const estiloNombre = useAnimatedStyle(() => ({
    opacity: opacidad.value,
    transform: [{ translateY: desplazamiento.value }],
  }));

  return (
    <Animated.View
      exiting={FadeOut.duration(320)}
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: fondo }]}>
      <Animated.View style={estiloLogo}>
        {logo ? (
          <View style={styles.logoFrame}>
            <Image source={{ uri: logo }} style={styles.logo} resizeMode="contain" />
          </View>
        ) : (
          <View style={[styles.logoFrame, styles.inicial]}>
            <Text style={[styles.inicialTexto, { color: fondo }]}>
              {nombre.trim().charAt(0).toUpperCase() || 'G'}
            </Text>
          </View>
        )}
      </Animated.View>

      <Animated.View style={estiloNombre}>
        <Text style={[styles.nombre, { color: textoSobreFondo }]}>{nombre}</Text>
        <Text style={[styles.pie, { color: textoSobreFondo }]}>con GymTrack</Text>
      </Animated.View>
    </Animated.View>
  );
}

// Envuelve lo anterior: decide si toca mostrar la bienvenida y la quita sola.
export function useGymSplash(logoOnombre: { nombre?: string } | null) {
  const [visto, setVisto] = useState(false);
  const listo = !!logoOnombre?.nombre;
  return { debeMostrar: listo && !visto, marcarVisto: () => setVisto(true) };
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: 24, zIndex: 100 },
  logoFrame: {
    width: 132,
    height: 132,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 14,
  },
  logo: { width: '100%', height: '100%' },
  inicial: { padding: 0 },
  inicialTexto: { fontFamily: FontFamily.extraBold, fontSize: 60 },
  nombre: { fontFamily: FontFamily.extraBold, fontSize: 26, textAlign: 'center' },
  pie: { fontFamily: FontFamily.medium, fontSize: 13, textAlign: 'center', opacity: 0.75, marginTop: 4 },
});
