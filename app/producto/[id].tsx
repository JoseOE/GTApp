import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StateCard } from '@/components/ui/StateCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Estrellas } from '@/components/tienda/Estrellas';
import { AdvertenciaSanitaria } from '@/components/tienda/AdvertenciaSanitaria';
import { Resenas } from '@/components/tienda/Resenas';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { puedeComprar, useCarrito } from '@/lib/CarritoContext';
import { dinero, urlImagen } from '@/lib/formato';
import { fetchProducto, type Producto } from '@/lib/tienda';

export default function ProductoScreen() {
  // resenar=1: viene de "Califica tu compra" y abre el editor de la reseña.
  const { id, resenar } = useLocalSearchParams<{ id: string; resenar?: string }>();
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const { agregar } = useCarrito();
  const gymId = account?.gymId ?? null;

  const [producto, setProducto] = useState<Producto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [varianteId, setVarianteId] = useState<string | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [agregando, setAgregando] = useState(false);

  const cargar = useCallback(async () => {
    if (!gymId || !id) return;
    try {
      const p = await fetchProducto(gymId, id);
      setProducto(p);
      setError(null);
      // La primera presentación que todavía hay.
      setVarianteId((actual) => actual ?? (p.variantes.find((v) => !v.agotado) ?? p.variantes[0])?.id ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el producto.');
    }
  }, [gymId, id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error && !producto) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StateCard icon="alert-circle-outline" tone="danger" title="No disponible" message={error} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!producto) {
    return (
      <View style={[styles.safe, styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  const variante = producto.variantes.find((v) => v.id === varianteId) ?? null;
  const esPlan = producto.tipo === 'membresia';
  const maximo = esPlan ? 1 : variante?.disponible ?? 99;
  const comprador = puedeComprar(account);
  const imagen = urlImagen(producto.imagen);

  async function agregarAlCarrito() {
    if (!variante) return;
    setAgregando(true);
    try {
      await agregar(variante.id, cantidad);
      Alert.alert('Agregado al carrito', `${producto!.nombre}${cantidad > 1 ? ` × ${cantidad}` : ''}`, [
        { text: 'Seguir comprando', style: 'cancel' },
        { text: 'Ver carrito', onPress: () => router.push('/carrito') },
      ]);
    } catch (err) {
      Alert.alert('No se pudo agregar', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setAgregando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: esPlan ? 'Membresía' : producto.categoria?.nombre ?? 'Producto' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.imagenCaja, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          {imagen ? (
            <Image source={{ uri: imagen }} style={styles.imagen} resizeMode="contain" />
          ) : (
            <Ionicons name={esPlan ? 'ribbon-outline' : 'cube-outline'} size={60} color={colors.textSecondary} />
          )}
        </View>

        <View style={{ gap: Spacing.xs }}>
          <Text style={[styles.nombre, { color: colors.text }]}>{producto.nombre}</Text>
          {producto.calificacion ? (
            <Estrellas promedio={producto.calificacion.promedio} total={producto.calificacion.total} size={16} />
          ) : (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Sin reseñas todavía</Text>
          )}
          <Text style={[styles.precio, { color: brand.primaryDark }]}>{dinero(variante?.precio ?? producto.precioDesde)}</Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Precio con IVA incluido</Text>
        </View>

        {producto.variantes.length > 1 ? (
          <View style={{ gap: Spacing.sm }}>
            <Text style={[styles.seccion, { color: colors.text }]}>Presentación</Text>
            <View style={styles.variantes}>
              {producto.variantes.map((v) => {
                const activa = v.id === varianteId;
                return (
                  <AnimatedPressable
                    key={v.id}
                    disabled={v.agotado}
                    haptic={false}
                    onPress={() => {
                      setVarianteId(v.id);
                      setCantidad(1);
                    }}
                    style={[
                      styles.variante,
                      {
                        borderColor: activa ? brand.primary : colors.border,
                        backgroundColor: activa ? brand.primary + '14' : colors.surface,
                        opacity: v.agotado ? 0.45 : 1,
                      },
                    ]}>
                    <Text style={[styles.varianteNombre, { color: colors.text }]}>{v.nombre}</Text>
                    <Text style={[styles.meta, { color: colors.textSecondary }]}>
                      {v.agotado ? 'Agotado' : dinero(v.precio)}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {variante?.controlarInventario && !variante.agotado && variante.disponible != null && variante.disponible <= 5 ? (
          <Badge label={`Quedan ${variante.disponible}`} tone="warning" icon="alert-circle-outline" />
        ) : null}

        {esPlan && producto.plan ? (
          <Card style={{ gap: Spacing.sm }}>
            <Text style={[styles.seccion, { color: colors.text }]}>{producto.plan.duracionTexto}</Text>
            {producto.plan.beneficios.map((b) => (
              <View key={b} style={styles.beneficio}>
                <Ionicons name="checkmark-circle" size={16} color={brand.success} />
                <Text style={[styles.texto, { color: colors.text, flex: 1 }]}>{b}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {producto.descripcion ? (
          <View style={{ gap: Spacing.xs }}>
            <Text style={[styles.seccion, { color: colors.text }]}>Descripción</Text>
            <Text style={[styles.texto, { color: colors.textSecondary }]}>{producto.descripcion}</Text>
          </View>
        ) : null}

        {producto.marca || producto.proveedor ? (
          <Card style={{ gap: Spacing.sm }}>
            {producto.marca ? <Dato etiqueta="Marca" valor={producto.marca} /> : null}
            {producto.proveedor ? (
              <Dato
                etiqueta="Proveedor"
                valor={producto.proveedor}
                enlace={producto.sitioProveedor ?? undefined}
              />
            ) : null}
          </Card>
        ) : null}

        {producto.requiereAdvertencia ? <AdvertenciaSanitaria /> : null}

        {!esPlan && gymId ? (
          <Resenas
            gymId={gymId}
            productoId={producto.id}
            productoNombre={producto.nombre}
            abrirEditor={resenar === '1'}
            onCambio={cargar}
          />
        ) : null}
      </ScrollView>

      <View style={[styles.pie, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        {comprador ? (
          <>
            {!esPlan ? (
              <View style={styles.cantidad}>
                <Paso icon="remove" disabled={cantidad <= 1} onPress={() => setCantidad((c) => Math.max(1, c - 1))} />
                <Text style={[styles.cantidadNumero, { color: colors.text }]}>{cantidad}</Text>
                <Paso icon="add" disabled={cantidad >= maximo} onPress={() => setCantidad((c) => Math.min(maximo, c + 1))} />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={variante?.agotado || producto.agotado ? 'Agotado' : 'Agregar al carrito'}
                icon="cart-outline"
                onPress={agregarAlCarrito}
                loading={agregando}
                disabled={!variante || variante.agotado}
              />
            </View>
          </>
        ) : (
          <Text style={[styles.meta, { color: colors.textSecondary, flex: 1, textAlign: 'center' }]}>
            Podrás comprar cuando el gimnasio apruebe tu solicitud.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

function Dato({ etiqueta, valor, enlace }: { etiqueta: string; valor: string; enlace?: string }) {
  const { colors, brand } = useTheme();
  const url = enlace && !/^https?:\/\//i.test(enlace) ? `https://${enlace}` : enlace;
  return (
    <View style={styles.dato}>
      <Text style={[styles.datoEtiqueta, { color: colors.textSecondary }]}>{etiqueta}</Text>
      {url ? (
        <AnimatedPressable onPress={() => WebBrowser.openBrowserAsync(url)} haptic={false} style={styles.datoEnlace}>
          <Text style={[styles.datoValor, { color: brand.primaryDark, textDecorationLine: 'underline' }]}>{valor}</Text>
          <Ionicons name="open-outline" size={14} color={brand.primaryDark} />
        </AnimatedPressable>
      ) : (
        <Text style={[styles.datoValor, { color: colors.text }]}>{valor}</Text>
      )}
    </View>
  );
}

function Paso({ icon, onPress, disabled }: { icon: 'add' | 'remove'; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={icon === 'add' ? 'Una más' : 'Una menos'}
      style={[styles.paso, { borderColor: colors.border, opacity: disabled ? 0.35 : 1 }]}>
      <Ionicons name={icon} size={18} color={colors.text} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  imagenCaja: {
    height: 240,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: { width: '100%', height: '100%' },
  nombre: { fontFamily: FontFamily.bold, fontSize: 21, lineHeight: 27 },
  precio: { fontFamily: FontFamily.extraBold, fontSize: 24, marginTop: Spacing.xs },
  meta: { fontSize: 12.5 },
  seccion: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  texto: { fontSize: 13.5, lineHeight: 20 },
  variantes: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  variante: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  varianteNombre: { fontFamily: FontFamily.medium, fontSize: 13.5 },
  beneficio: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  dato: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  datoEtiqueta: { fontSize: 13 },
  datoValor: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  datoEnlace: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pie: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  cantidad: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cantidadNumero: { fontFamily: FontFamily.semiBold, fontSize: 16, minWidth: 22, textAlign: 'center' },
  paso: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
