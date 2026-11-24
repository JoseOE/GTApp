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

// Las fotos de un ejercicio, como en la página: la posición inicial y la final.
// Van sobre blanco (así vienen las fotos) y con su etiqueta. Al tocarlas se
// abren en grande y alternan solas entre inicio y final, para ver el
// movimiento; con "movimiento reducido" no alternan y se elige con los botones.

const ETIQUETAS = ['Inicio', 'Final'];
const PAUSA_MS = 1100;

// Solo las que cargan: si una falla (sin internet, por ejemplo) no deja un hueco.
function useFotosQueCargan(imagenes: string[] | null | undefined) {
  const [fallidas, setFallidas] = useState<Record<string, true>>({});
  const lista = (imagenes ?? []).slice(0, 2).filter((u) => !fallidas[u]);
  const fallo = (u: string) => setFallidas((f) => ({ ...f, [u]: true }));
  return { lista, fallo };
}

export function FotosEjercicio({ imagenes, nombre }: { imagenes?: string[] | null; nombre: string }) {
  const { colors } = useTheme();
  const { lista, fallo } = useFotosQueCargan(imagenes);
  const [visor, setVisor] = useState<number | null>(null);
  if (!lista.length) return null;

  return (
    <>
      <View style={styles.fila}>
        {lista.map((u, i) => (
          <AnimatedPressable
            key={u}
            onPress={() => setVisor(i)}
            scaleTo={0.97}
            accessibilityRole="imagebutton"
            accessibilityLabel={`${nombre}: posición ${ETIQUETAS[i].toLowerCase()}. Toca para ver en grande`}
            style={[styles.foto, { borderColor: colors.border }]}>
            <Image source={{ uri: u }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => fallo(u)} />
            <View style={styles.etiqueta}>
              <Text style={styles.etiquetaTexto}>{lista.length > 1 ? ETIQUETAS[i] : 'Referencia'}</Text>
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

// Una foto chica (la posición inicial) para listas, como la lista de máquinas.
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
        accessibilityLabel={`Ver fotos de ${nombre}`}
        style={[styles.miniatura, { width: tamano, height: tamano, borderColor: colors.border }]}>
        <Image source={{ uri: lista[0] }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => fallo(lista[0])} />
      </AnimatedPressable>
      <VisorFotos visible={abierto} inicial={0} imagenes={lista} nombre={nombre} onCerrar={() => setAbierto(false)} />
    </>
  );
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
  // Alterna sola hasta que la persona elige una con los botones.
  const [enMovimiento, setEnMovimiento] = useState(!reducir);
  const opacidadFinal = useSharedValue(inicial === 1 ? 1 : 0);
  const dos = imagenes.length > 1;

  useEffect(() => {
    if (!visible) return;
    setActual(inicial);
    setEnMovimiento(!reducir && dos);
  }, [visible, inicial, reducir, dos]);

  useEffect(() => {
    opacidadFinal.value = reducir ? (actual === 1 ? 1 : 0) : withTiming(actual === 1 ? 1 : 0, { duration: 260 });
  }, [actual, reducir, opacidadFinal]);

  useEffect(() => {
    if (!visible || !enMovimiento || !dos) return;
    const t = setInterval(() => setActual((a) => (a === 0 ? 1 : 0)), PAUSA_MS);
    return () => clearInterval(t);
  }, [visible, enMovimiento, dos]);

  const estiloFinal = useAnimatedStyle(() => ({ opacity: opacidadFinal.value }));

  // La foto lo más grande posible sin salirse: 4:3, con margen.
  const ancho = Math.min(width - Spacing.xl * 2, 560);
  const alto = Math.min((ancho * 3) / 4, height * 0.55);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCerrar} statusBarTranslucent>
      <SafeAreaView style={styles.fondo}>
        <AnimatedPressable
          onPress={onCerrar}
          hitSlop={10}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Cerrar fotos"
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
            accessibilityLabel={`${nombre}: posición ${(ETIQUETAS[actual] ?? 'inicio').toLowerCase()}`}>
            <Image source={{ uri: imagenes[0] }} style={StyleSheet.absoluteFill} resizeMode="contain" />
            {dos ? (
              <Animated.Image
                source={{ uri: imagenes[1] }}
                style={[StyleSheet.absoluteFill, estiloFinal]}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {dos ? (
            <View style={styles.selector}>
              {ETIQUETAS.map((et, i) => {
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

          <Text style={[Type.caption, styles.nota]}>
            Foto de referencia. Pide al coach que revise tu técnica.
          </Text>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  foto: {
    flex: 1,
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: StyleSheet.hairlineWidth,
  },
  etiqueta: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(18,18,20,0.72)',
  },
  etiquetaTexto: { fontFamily: FontFamily.semiBold, fontSize: 11, lineHeight: 15, color: '#FFFFFF' },
  miniatura: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
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
  visorFoto: { borderRadius: Radius.lg, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  selector: { flexDirection: 'row', alignSelf: 'center', gap: Spacing.xs, padding: 4, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.1)' },
  opcion: { minHeight: 36, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  opcionIcono: { paddingHorizontal: 0, width: 36 },
  opcionTexto: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  nota: { textAlign: 'center', color: 'rgba(255,255,255,0.6)' },
});
