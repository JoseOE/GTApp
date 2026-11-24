import { useEffect, useState } from 'react';
import { Image, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';

// Cómo se hace un ejercicio, en imágenes, como en la página: un maniquí en la
// posición inicial y la final (algunos traen un cuadro intermedio y las
// planchas o estiramientos, uno solo). En la tarjeta van la primera y la
// última; al tocarlas se abren en grande y pasan solas de una posición a la
// otra para ver el movimiento. Con "movimiento reducido" no pasan solas y se
// elige con los botones.

const PAUSA_MS = 1000;
// Fondo de las ilustraciones (el maniquí va sobre negro).
const FONDO = '#0D0D0F';

function etiquetas(n: number) {
  if (n === 1) return ['Posición'];
  if (n === 2) return ['Inicio', 'Final'];
  return ['Inicio', 'Medio', 'Final'].slice(0, n);
}

// Solo las que cargan: si una falla (sin internet, por ejemplo) no deja un hueco.
function useFotosQueCargan(imagenes: string[] | null | undefined) {
  const [fallidas, setFallidas] = useState<Record<string, true>>({});
  const lista = (imagenes ?? []).slice(0, 3).filter((u) => !fallidas[u]);
  const fallo = (u: string) => setFallidas((f) => ({ ...f, [u]: true }));
  return { lista, fallo };
}

export function FotosEjercicio({ imagenes, nombre }: { imagenes?: string[] | null; nombre: string }) {
  const { colors } = useTheme();
  const { lista, fallo } = useFotosQueCargan(imagenes);
  const [visor, setVisor] = useState<number | null>(null);
  if (!lista.length) return null;

  // En la tarjeta, la primera y la última posición.
  const indices = lista.length > 2 ? [0, lista.length - 1] : lista.map((_, i) => i);
  const nombres = etiquetas(lista.length);

  return (
    <>
      <View style={styles.fila}>
        {indices.map((i) => (
          <AnimatedPressable
            key={lista[i]}
            onPress={() => setVisor(i)}
            scaleTo={0.97}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${nombre}: ${nombres[i].toLowerCase()}. Toca para ver en grande`}
            style={[styles.foto, { borderColor: colors.border }]}>
            <Image source={{ uri: lista[i] }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => fallo(lista[i])} />
            <View style={styles.etiqueta}>
              <Text style={styles.etiquetaTexto}>{nombres[i]}</Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>
      <VisorFotos
        visible={visor !== null}
        inicial={visor ?? 0}
        imagenes={lista}
        nombre={nombre}
        onCerrar={() => setVisor(null)}
      />
    </>
  );
}

// Una imagen chica (la posición inicial) para listas y tarjetas.
export function MiniaturaEjercicio({
  imagenes,
  nombre,
  tamano = 52,
}: {
  imagenes?: string[] | null;
  nombre: string;
  tamano?: number;
}) {
  const { colors } = useTheme();
  const { lista, fallo } = useFotosQueCargan(imagenes);
  const [abierto, setAbierto] = useState(false);
  if (!lista.length) return null;

  return (
    <>
      <AnimatedPressable
        onPress={() => setAbierto(true)}
        scaleTo={0.94}
        accessibilityRole="imagebutton"
        accessibilityLabel={`Ver cómo se hace ${nombre}`}
        style={[styles.miniatura, { width: tamano, height: tamano, borderColor: colors.border }]}>
        <Image source={{ uri: lista[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => fallo(lista[0])} />
      </AnimatedPressable>
      <VisorFotos visible={abierto} inicial={0} imagenes={lista} nombre={nombre} onCerrar={() => setAbierto(false)} />
    </>
  );
}

// Un cuadro del visor: aparece y desaparece con un fundido corto.
function Cuadro({ uri, activo, reducir }: { uri: string; activo: boolean; reducir: boolean }) {
  const opacidad = useSharedValue(activo ? 1 : 0);
  useEffect(() => {
    opacidad.value = reducir ? (activo ? 1 : 0) : withTiming(activo ? 1 : 0, { duration: 240 });
  }, [activo, reducir, opacidad]);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.value }));
  return <Animated.Image source={{ uri }} style={[StyleSheet.absoluteFill, estilo]} resizeMode="contain" />;
}

function VisorFotos({
  visible,
  inicial,
  imagenes,
  nombre,
  onCerrar,
}: {
  visible: boolean;
  inicial: number;
  imagenes: string[];
  nombre: string;
  onCerrar: () => void;
}) {
  const { brand } = useTheme();
  const reducir = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const [actual, setActual] = useState(inicial);
  const varios = imagenes.length > 1;
  // Pasa sola de una posición a otra hasta que la persona elige una.
  const [enMovimiento, setEnMovimiento] = useState(!reducir && varios);
  const nombres = etiquetas(imagenes.length);

  useEffect(() => {
    if (!visible) return;
    setActual(inicial);
    setEnMovimiento(!reducir && varios);
  }, [visible, inicial, reducir, varios]);

  useEffect(() => {
    if (!visible || !enMovimiento || !varios) return;
    const t = setInterval(() => setActual((a) => (a + 1) % imagenes.length), PAUSA_MS);
    return () => clearInterval(t);
  }, [visible, enMovimiento, varios, imagenes.length]);

  // La imagen lo más grande posible sin salirse: 5:4, como vienen.
  const ancho = Math.min(width - Spacing.xl * 2, 560);
  const alto = Math.min((ancho * 4) / 5, height * 0.55);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <SafeAreaView style={styles.fondo}>
        <AnimatedPressable
          onPress={onCerrar}
          hitSlop={10}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={styles.cerrar}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </AnimatedPressable>

        <Animated.View entering={reducir ? undefined : FadeIn.duration(180)} style={{ width: ancho, gap: Spacing.lg }}>
          <Text style={styles.visorTitulo} numberOfLines={2}>
            {nombre}
          </Text>

          <View
            style={[styles.visorFoto, { width: ancho, height: alto }]}
            accessible
            accessibilityRole="image"
            accessibilityLabel={`${nombre}: ${(nombres[actual] ?? '').toLowerCase()}`}>
            {imagenes.map((u, i) => (
              <Cuadro key={u} uri={u} activo={i === actual} reducir={reducir} />
            ))}
          </View>

          {varios ? (
            <View style={styles.selector}>
              {nombres.map((et, i) => {
                const activo = actual === i;
                return (
                  <AnimatedPressable
                    key={et}
                    onPress={() => {
                      setEnMovimiento(false);
                      setActual(i);
                    }}
                    scaleTo={0.95}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    style={[styles.opcion, activo && { backgroundColor: '#FFFFFF' }]}>
                    <Text style={[styles.opcionTexto, { color: activo ? '#121214' : 'rgba(255,255,255,0.8)' }]}>{et}</Text>
                  </AnimatedPressable>
                );
              })}
              <AnimatedPressable
                onPress={() => setEnMovimiento((m) => !m)}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={enMovimiento ? 'Pausar el movimiento' : 'Ver el movimiento'}
                style={[styles.opcion, styles.opcionIcono, enMovimiento && { backgroundColor: brand.primary }]}>
                <Ionicons name={enMovimiento ? 'pause' : 'play'} size={16} color="#FFFFFF" />
              </AnimatedPressable>
            </View>
          ) : null}

          <Text style={[Type.caption, styles.nota]}>Imagen de referencia. Pide al coach que revise tu técnica.</Text>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  foto: {
    flex: 1,
    aspectRatio: 5 / 4,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: FONDO,
    borderWidth: StyleSheet.hairlineWidth,
  },
  etiqueta: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  etiquetaTexto: { fontFamily: FontFamily.semiBold, fontSize: 11, lineHeight: 15, color: '#FFFFFF' },
  miniatura: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: FONDO,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(8,8,10,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  cerrar: {
    position: 'absolute',
    top: Spacing.xxxl,
    right: Spacing.xl,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  visorTitulo: { fontFamily: FontFamily.bold, fontSize: 20, lineHeight: 26, color: '#FFFFFF', letterSpacing: -0.3 },
  visorFoto: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: FONDO },
  selector: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: Spacing.xs,
    padding: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  opcion: { minHeight: 36, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  opcionIcono: { paddingHorizontal: 0, width: 36 },
  opcionTexto: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  nota: { textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
});
