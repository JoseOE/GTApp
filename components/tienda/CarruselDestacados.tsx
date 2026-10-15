import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { COLOR_ESTRELLA, Estrellas } from './Estrellas';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { dinero, urlImagen } from '@/lib/formato';
import { fetchDestacados, type Destacado } from '@/lib/tienda';

// "Lo mejor calificado": productos con más de 3.8 estrellas y una reseña de
// muestra. Si el gimnasio todavía no tiene ninguno, no se muestra nada.
export function CarruselDestacados({ gymId }: { gymId: string }) {
  const { colors, brand } = useTheme();
  const [destacados, setDestacados] = useState<Destacado[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      fetchDestacados(gymId)
        .then((d) => {
          if (!cancelado) setDestacados(d);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [gymId])
  );

  if (destacados.length === 0) return null;

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.titulo}>
        <Ionicons name="star" size={16} color={COLOR_ESTRELLA} />
        <Text style={[styles.tituloTexto, { color: colors.text }]}>Lo mejor calificado</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
        snapToInterval={TARJETA + Spacing.md}
        decelerationRate="fast">
        {destacados.map((d) => {
          const imagen = urlImagen(d.imagen);
          return (
            <AnimatedPressable
              key={d.id}
              haptic={false}
              scaleTo={0.97}
              onPress={() => router.push({ pathname: '/producto/[id]', params: { id: d.id } })}>
              <Card padded={false} style={styles.tarjeta}>
                <View style={styles.cabeza}>
                  <View style={[styles.miniatura, { backgroundColor: colors.surfaceMuted }]}>
                    {imagen ? (
                      <Image source={{ uri: imagen }} style={styles.miniaturaImg} />
                    ) : (
                      <Ionicons name="cube-outline" size={22} color={colors.textSecondary} />
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={2}>
                      {d.nombre}
                    </Text>
                    <Estrellas promedio={d.calificacion.promedio} total={d.calificacion.total} size={12} />
                    <Text style={[styles.precio, { color: brand.primaryDark }]}>{dinero(d.precioDesde)}</Text>
                  </View>
                </View>
                {d.resena ? (
                  <View style={[styles.cita, { backgroundColor: colors.surfaceMuted }]}>
                    <Text style={[styles.citaTexto, { color: colors.text }]} numberOfLines={3}>
                      “{d.resena.comentario}”
                    </Text>
                    <Text style={[styles.citaAutor, { color: colors.textSecondary }]}>— {d.resena.autor}</Text>
                  </View>
                ) : null}
              </Card>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const TARJETA = 260;

const styles = StyleSheet.create({
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tituloTexto: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  fila: { gap: Spacing.md, paddingRight: Spacing.xl },
  tarjeta: { width: TARJETA, padding: Spacing.md, gap: Spacing.sm },
  cabeza: { flexDirection: 'row', gap: Spacing.md },
  miniatura: { width: 64, height: 64, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  miniaturaImg: { width: '100%', height: '100%' },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  precio: { fontFamily: FontFamily.bold, fontSize: 13.5 },
  cita: { borderRadius: Radius.sm, padding: Spacing.sm, gap: 2 },
  citaTexto: { fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  citaAutor: { fontSize: 11.5 },
});
