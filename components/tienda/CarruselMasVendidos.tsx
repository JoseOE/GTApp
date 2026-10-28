import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { dinero, urlImagen } from '@/lib/formato';
import { fetchMasVendidos, type MasVendido } from '@/lib/tienda';

// "Lo más vendido en tu gimnasio": los productos con más piezas vendidas
// del gimnasio del miembro, con su lugar (#1, #2…). Si el gimnasio todavía no
// vende nada, no se muestra.
export function CarruselMasVendidos({ gymId }: { gymId: string }) {
  const { colors, brand, onPrimary } = useTheme();
  const [productos, setProductos] = useState<MasVendido[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      fetchMasVendidos(gymId)
        .then((p) => {
          if (!cancelado) setProductos(p);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [gymId])
  );

  if (productos.length === 0) return null;

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={styles.titulo}>
        <Ionicons name="flame" size={16} color={brand.primary} />
        <Text style={[styles.tituloTexto, { color: colors.text }]}>Lo más vendido en tu gimnasio</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
        snapToInterval={TARJETA + Spacing.md}
        decelerationRate="fast">
        {productos.map((p, i) => {
          const imagen = urlImagen(p.imagen);
          return (
            <AnimatedPressable
              key={p.id}
              haptic={false}
              scaleTo={0.97}
              accessibilityLabel={`Número ${i + 1}: ${p.nombre}, ${dinero(p.precioDesde)}`}
              onPress={() => router.push({ pathname: '/producto/[id]', params: { id: p.id } })}>
              <Card padded={false} style={styles.tarjeta}>
                <View style={[styles.imagenCaja, { backgroundColor: colors.surfaceMuted }]}>
                  {imagen ? (
                    <Image source={{ uri: imagen }} style={styles.imagen} resizeMode="cover" />
                  ) : (
                    <Ionicons name="cube-outline" size={30} color={colors.textSecondary} />
                  )}
                  <View style={[styles.lugar, { backgroundColor: i === 0 ? brand.primary : colors.text }]}>
                    <Text style={[styles.lugarTexto, { color: i === 0 ? onPrimary : colors.background }]}>#{i + 1}</Text>
                  </View>
                </View>
                <View style={styles.cuerpo}>
                  <Text style={[styles.nombre, { color: colors.text }]} numberOfLines={2}>
                    {p.nombre}
                  </Text>
                  <Text style={[styles.precio, { color: brand.primaryDark }]}>
                    {p.variantes.length > 1 ? 'Desde ' : ''}
                    {dinero(p.precioDesde)}
                  </Text>
                  <Text style={[styles.vendidos, { color: colors.textSecondary }]}>
                    {p.vendidos} {p.vendidos === 1 ? 'vendido' : 'vendidos'}
                  </Text>
                </View>
              </Card>
            </AnimatedPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const TARJETA = 150;

const styles = StyleSheet.create({
  titulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tituloTexto: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  fila: { gap: Spacing.md, paddingRight: Spacing.xl },
  tarjeta: { width: TARJETA, overflow: 'hidden' },
  imagenCaja: { height: 110, alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
  lugar: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  lugarTexto: { fontFamily: FontFamily.bold, fontSize: 12 },
  cuerpo: { padding: Spacing.md, gap: 2 },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 13, lineHeight: 17, minHeight: 34 },
  precio: { fontFamily: FontFamily.bold, fontSize: 14 },
  vendidos: { fontSize: 11.5 },
});
