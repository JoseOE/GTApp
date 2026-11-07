import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import { tipografiaDe } from '@/constants/Tipografias';
import { PIE_NOMBRE_PORTADA, altoPortada, tamanoNombrePortada } from '@/components/inicio/PortadaGym';
import type { Marca } from '@/lib/marcaGuardada';
import { hexToRgb } from '@/lib/color';

// Cuánto se queda como mínimo (para que se alcance a leer) y como máximo
// esperando a la cuenta (si el servidor tarda, se sigue de todos modos).
const MINIMO_MS = 1100;
const MAXIMO_MS = 6000;
// En la bienvenida el nombre va más grande que en la portada; al final se
// encoge a su tamaño de la portada.
const ESCALA_BIENVENIDA = 1.3;

// Resorte sin rebote (amortiguamiento crítico): la bienvenida se acomoda en la
// portada sin pasarse ni regresar.
const ACOMODO = { damping: 26, stiffness: 170, overshootClamping: true };

// Bienvenida del gimnasio al abrir la app: su color con un degradado hacia el
// oscuro de la marca, su logo y su nombre en la letra que eligió en el panel.
// Al terminar no se desvanece: se encoge hasta el alto de la portada de Inicio
// y el nombre baja a su lugar, así parece que se convierte en la portada.
//  - listo: ya llegó la cuenta (hasta entonces se queda, máximo 6 s).
//  - convertirEnPortada: Inicio está detrás; si no, solo se desvanece.
// Se salta con un toque. Con "Reducir movimiento", solo se desvanece.
export function GymSplash({
  marca,
  listo,
  convertirEnPortada,
  onDone,
}: {
  marca: Marca;
  listo: boolean;
  convertirEnPortada: boolean;
  onDone: () => void;
}) {
  const { brand } = useTheme();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducir = useReducedMotion();
  // Solo un hex válido; si el gimnasio guardó otra cosa, el naranja de GymTrack.
  const fondo = marca.colorPrimario && hexToRgb(marca.colorPrimario) ? marca.colorPrimario : brand.primary;
  const letra = tipografiaDe(marca.tipografia);
  const tamanoPortada = tamanoNombrePortada(marca.tipografia);
  const tamano = Math.round(tamanoPortada * ESCALA_BIENVENIDA);

  const entrada = useSharedValue(0);
  const alto = useSharedValue(height);
  const opacidad = useSharedValue(1);
  const adornos = useSharedValue(1);
  const nombreX = useSharedValue(0);
  const nombreY = useSharedValue(0);
  const nombreEscala = useSharedValue(1);

  const [minimoCumplido, setMinimoCumplido] = useState(false);
  const [vencido, setVencido] = useState(false);
  const saliendo = useRef(false);
  const nombreRef = useRef<View>(null);

  useEffect(() => {
    entrada.value = withTiming(1, { duration: reducir ? 200 : 600, easing: Easing.out(Easing.cubic) });
    const minimo = setTimeout(() => setMinimoCumplido(true), MINIMO_MS);
    const maximo = setTimeout(() => setVencido(true), MAXIMO_MS);
    return () => {
      clearTimeout(minimo);
      clearTimeout(maximo);
    };
  }, [entrada, reducir]);

  function salir() {
    if (saliendo.current) return;
    saliendo.current = true;
    const terminar = () => onDone();

    const desvanecer = () => {
      opacidad.value = withTiming(0, { duration: 280 }, (ok) => ok && runOnJS(terminar)());
    };
    if (!convertirEnPortada || reducir || !nombreRef.current) return desvanecer();

    // Dónde está el nombre ahora (se mide al salir: no depende de cuándo se
    // dibujó) y dónde queda en la portada: pegado a la izquierda y sobre la
    // píldora del estado. Se mueve de un centro al otro.
    nombreRef.current.measureInWindow((x, y, w, h) => {
      if (!w || !h) return desvanecer();
      acomodarEnPortada(x, y, w, h);
    });
  }

  function acomodarEnPortada(x: number, y: number, w: number, h: number) {
    const terminar = () => onDone();
    const escalaFinal = tamanoPortada / tamano;
    const pie = altoPortada(width, insets.top) - PIE_NOMBRE_PORTADA;
    nombreX.value = withSpring(Spacing.xl + (w * escalaFinal) / 2 - (x + w / 2), ACOMODO);
    nombreY.value = withSpring(pie - (h * escalaFinal) / 2 - (y + h / 2), ACOMODO);
    nombreEscala.value = withSpring(escalaFinal, ACOMODO);
    adornos.value = withTiming(0, { duration: 180 });
    alto.value = withSpring(altoPortada(width, insets.top), ACOMODO);
    // Al llegar, se funde con la portada de verdad (con sus fotos, si tiene).
    opacidad.value = withDelay(520, withTiming(0, { duration: 260 }, (ok) => ok && runOnJS(terminar)()));
  }

  useEffect(() => {
    if ((minimoCumplido && listo) || vencido) salir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimoCumplido, listo, vencido]);

  const estiloContenedor = useAnimatedStyle(() => ({ height: alto.value, opacity: opacidad.value }));
  const estiloLogo = useAnimatedStyle(() => ({
    opacity: entrada.value * adornos.value,
    transform: [{ scale: 0.8 + 0.2 * entrada.value }],
  }));
  const estiloNombre = useAnimatedStyle(() => ({
    opacity: entrada.value,
    transform: [
      { translateX: nombreX.value },
      { translateY: nombreY.value + (1 - entrada.value) * 18 },
      { scale: nombreEscala.value },
    ],
  }));
  const estiloPie = useAnimatedStyle(() => ({ opacity: entrada.value * adornos.value * 0.8 }));

  return (
    <Animated.View style={[styles.contenedor, estiloContenedor]} pointerEvents="box-none">
      <StatusBar style="light" />
      <Pressable style={{ height }} onPress={salir} accessibilityRole="button" accessibilityLabel={`${marca.nombre}. Toca para entrar`}>
        {/* Mismo degradado que la portada sin fotos: así el paso se ve continuo. */}
        <LinearGradient colors={[fondo, '#0E0E10']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill}>
          <Ionicons name="barbell" size={220} color="rgba(255,255,255,0.08)" style={[styles.marcaAgua, { top: insets.top + 40 }]} />
        </LinearGradient>

        <View style={styles.columna}>
          <Animated.View style={estiloLogo}>
            {marca.logo ? (
              <View style={styles.logo}>
                <Image source={{ uri: marca.logo }} style={styles.logoImg} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.logo, styles.inicial]}>
                <Text style={[styles.inicialTexto, { color: fondo }]}>{marca.nombre.trim().charAt(0).toUpperCase() || 'G'}</Text>
              </View>
            )}
          </Animated.View>

          <Animated.View ref={nombreRef} style={estiloNombre} collapsable={false}>
            <Text
              style={[
                styles.nombre,
                {
                  fontFamily: letra.familia,
                  fontSize: tamano,
                  lineHeight: Math.round(tamano * 1.08),
                  letterSpacing: letra.tracking,
                  maxWidth: width - Spacing.xl * 2,
                },
              ]}
              numberOfLines={2}>
              {marca.nombre}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.pie, { bottom: insets.bottom + Spacing.xxl }, estiloPie]}>
          <Ionicons name="barbell" size={14} color="#FFFFFF" />
          <Text style={[Type.caption, styles.pieTexto]}>con GymTrack</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden', zIndex: 100 },
  marcaAgua: { position: 'absolute', right: -40, transform: [{ rotate: '-20deg' }] },
  columna: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl },
  logo: {
    width: 76,
    height: 76,
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 10,
  },
  logoImg: { width: '100%', height: '100%' },
  inicial: { padding: 0 },
  inicialTexto: { fontFamily: FontFamily.extraBold, fontSize: 36 },
  nombre: {
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  pie: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pieTexto: { color: '#FFFFFF' },
});
