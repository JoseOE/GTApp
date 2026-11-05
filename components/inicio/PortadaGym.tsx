import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { BotonCuenta } from '@/components/ui/TituloGrande';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import { tipografiaDe } from '@/constants/Tipografias';
import { urlImagen } from '@/lib/formato';
import type { Account } from '@/lib/api';

// Cada cuánto pasa sola a la siguiente foto, y cuánto espera después de que
// la persona deslizó con el dedo antes de volver a pasarlas.
const CADA_MS = 5000;
const PAUSA_TRAS_DESLIZAR_MS = 9000;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "2026-11-25" → "25 nov" (a mano: new Date con una fecha suelta la toma en UTC).
function fechaCorta(iso: string | null) {
  if (!iso) return null;
  const [, mes, dia] = iso.split('-').map(Number);
  return mes && dia ? `${dia} ${MESES[mes - 1]}` : null;
}

function estadoMembresia(account: Account): { texto: string; color: string } | null {
  if (!account.gym) return null;
  if (account.membershipStatus === 'pending') return { texto: 'Solicitud en revisión', color: '#F5B700' };
  if (account.membershipStatus === 'inactive') return { texto: 'Membresía pausada', color: '#FF5A5F' };
  if (!account.hasGymAccess) return null;
  const hasta = fechaCorta(account.fechaProximoPago);
  const vencida = account.diasParaVencer != null && account.diasParaVencer < 0;
  if (vencida) return { texto: 'Mensualidad vencida', color: '#FF5A5F' };
  return { texto: hasta ? `Membresía activa · hasta ${hasta}` : 'Membresía activa', color: '#34D17A' };
}

// La portada de Inicio: las fotos del gimnasio pasando una tras otra, con su
// nombre encima en la letra que eligió el dueño en el panel web. Al tocarla
// se abre Mi gimnasio. Sin gimnasio, es la portada de GymTrack.
export function PortadaGym({ account }: { account: Account }) {
  const { brand } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducir = useReducedMotion();
  const lista = useRef<FlatList<string>>(null);
  const [actual, setActual] = useState(0);
  const pausadaHasta = useRef(0);

  const gym = account.gym;
  const fotos = (gym?.fotos ?? []).map(urlImagen).filter((u): u is string => !!u);
  const alto = Math.round(Math.min(width * 0.92, 440)) + insets.top;
  const letra = tipografiaDe(gym?.tipografia);
  const estado = estadoMembresia(account);

  // Pasa sola, salvo con una sola foto o con "Reducir movimiento".
  useEffect(() => {
    if (fotos.length < 2 || reducir) return;
    const t = setInterval(() => {
      if (Date.now() < pausadaHasta.current) return;
      setActual((i) => {
        const siguiente = (i + 1) % fotos.length;
        lista.current?.scrollToOffset({ offset: siguiente * width, animated: true });
        return siguiente;
      });
    }, CADA_MS);
    return () => clearInterval(t);
  }, [fotos.length, reducir, width]);

  const nombre = gym?.nombre ?? 'GymTrack';
  const tamano = Math.round(42 * (gym ? letra.escala : 1));

  // Tocar la portada abre Mi gimnasio (o vincular uno). Va en cada foto y no
  // en todo el bloque, para no meter el botón de Mi cuenta dentro de otro botón.
  const abrir = () => (gym ? router.push('/mi-gimnasio') : router.push('/gym-join'));
  const etiqueta = gym ? `${nombre}. Abre Mi gimnasio` : 'Vincula tu gimnasio';

  return (
    <View style={{ height: alto, backgroundColor: '#0E0E10' }}>
      {fotos.length > 0 ? (
        <FlatList
          ref={lista}
          data={fotos}
          keyExtractor={(u, i) => `${u}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => {
            pausadaHasta.current = Date.now() + PAUSA_TRAS_DESLIZAR_MS;
          }}
          onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / width))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={abrir}
              accessibilityRole="button"
              accessibilityLabel={index === 0 ? etiqueta : `Foto ${index + 1} de ${nombre}`}>
              <Image source={{ uri: item }} style={{ width, height: alto }} resizeMode="cover" />
            </Pressable>
          )}
        />
      ) : (
        <Pressable onPress={abrir} accessibilityRole="button" accessibilityLabel={etiqueta} style={StyleSheet.absoluteFill}>
          <LinearGradient colors={[brand.primary, '#0E0E10']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill}>
            <Ionicons name="barbell" size={220} color="rgba(255,255,255,0.08)" style={styles.marcaAgua} />
          </LinearGradient>
        </Pressable>
      )}

      {/* Sombra arriba (para la hora y la batería) y abajo (para el nombre). */}
      <LinearGradient
        colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0)']}
        style={[styles.sombraArriba, { height: insets.top + 80 }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
        style={styles.sombraAbajo}
        pointerEvents="none"
      />

      <View style={[styles.arriba, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
        {gym?.logo ? (
          <View style={styles.logo}>
            <Image source={{ uri: gym.logo }} style={styles.logoImg} resizeMode="contain" />
          </View>
        ) : (
          <View />
        )}
        <BotonCuenta sobreFoto />
      </View>

      <View style={styles.abajo} pointerEvents="none">
        <Text style={[Type.overline, styles.rotulo]}>{gym ? 'TU GIMNASIO' : 'ENTRENA DONDE SEA'}</Text>
        <Text
          style={[
            styles.nombre,
            { fontFamily: gym ? letra.familia : FontFamily.extraBold, fontSize: tamano, lineHeight: Math.round(tamano * 1.08), letterSpacing: gym ? letra.tracking : -0.8 },
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.6}>
          {nombre}
        </Text>
        {estado ? (
          <View style={styles.chip}>
            <View style={[styles.punto, { backgroundColor: estado.color }]} />
            <Text style={[Type.caption, styles.chipTexto]}>{estado.texto}</Text>
          </View>
        ) : !gym ? (
          <View style={styles.chip}>
            <Ionicons name="key-outline" size={13} color="#FFFFFF" />
            <Text style={[Type.caption, styles.chipTexto]}>Toca para vincular tu gimnasio</Text>
          </View>
        ) : null}
      </View>

      {fotos.length > 1 ? (
        <View style={styles.puntos} pointerEvents="none">
          {fotos.map((u, i) => (
            <View key={`${u}-${i}`} style={[styles.indicador, i === actual && styles.indicadorActual]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  marcaAgua: { position: 'absolute', right: -40, top: 40, transform: [{ rotate: '-20deg' }] },
  sombraArriba: { position: 'absolute', top: 0, left: 0, right: 0 },
  sombraAbajo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  arriba: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: '#FFFFFF',
    padding: 4,
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  abajo: { position: 'absolute', left: Spacing.xl, right: Spacing.xl, bottom: Spacing.xl + 6, gap: Spacing.xs },
  rotulo: { color: 'rgba(255,255,255,0.75)' },
  nombre: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  punto: { width: 7, height: 7, borderRadius: 4 },
  chipTexto: { color: '#FFFFFF' },
  puntos: { position: 'absolute', right: Spacing.xl, bottom: Spacing.xl + 12, flexDirection: 'row', gap: 5 },
  indicador: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  indicadorActual: { width: 18, backgroundColor: '#FFFFFF' },
});
