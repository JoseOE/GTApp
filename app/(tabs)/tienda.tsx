import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StateCard } from '@/components/ui/StateCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Estrellas } from '@/components/tienda/Estrellas';
import { FontFamily, Radius, Shadow, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { puedeComprar, useCarrito } from '@/lib/CarritoContext';
import { dinero, urlImagen } from '@/lib/formato';
import { fetchCategorias, fetchProductos, type Categoria, type Producto } from '@/lib/tienda';

// La tienda del gimnasio: el miembro compra desde su casa y recoge en recepción.
export default function TiendaScreen() {
  const { colors, brand, onPrimary } = useTheme();
  const { account } = useAccount();
  const { carrito, recargar: recargarCarrito } = useCarrito();
  useAccountRefreshOnFocus();

  const gymId = account?.gymId ?? null;
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!gymId) return;
    try {
      setProductos(await fetchProductos(gymId, { categoria: categoria ?? undefined, q: busqueda }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la tienda.');
    }
  }, [gymId, categoria, busqueda]);

  // La búsqueda espera a que dejes de escribir.
  useEffect(() => {
    const t = setTimeout(cargar, busqueda ? 350 : 0);
    return () => clearTimeout(t);
  }, [cargar, busqueda]);

  useEffect(() => {
    fetchCategorias().then(setCategorias).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      recargarCarrito();
    }, [recargarCarrito])
  );

  async function refrescar() {
    setRefrescando(true);
    await Promise.all([cargar(), recargarCarrito()]);
    setRefrescando(false);
  }

  if (!account) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!gymId) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.vacio}>
          <StateCard
            icon="bag-handle-outline"
            tone="brand"
            title="La tienda es de tu gimnasio"
            message="Vincula tu gimnasio con el código que te dan en recepción para comprar suplementos, bebidas, accesorios y tu membresía desde aquí."
            actionLabel="Tengo un código"
            actionIcon="key-outline"
            onAction={() => router.push('/gym-join')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const comprador = puedeComprar(account);
  const articulos = carrito?.articulos ?? 0;

  const encabezado = (
    <View style={{ gap: Spacing.md, marginBottom: Spacing.md }}>
      {!comprador ? (
        <Card style={[styles.aviso, { borderColor: brand.warning }]}>
          <Ionicons name="hourglass-outline" size={18} color={brand.warning} />
          <Text style={[styles.avisoTexto, { color: colors.text }]}>
            Puedes ver la tienda, pero podrás comprar cuando el gimnasio apruebe tu solicitud.
          </Text>
        </Card>
      ) : null}

      <View style={[styles.buscador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={busqueda}
          onChangeText={setBusqueda}
          placeholder="Buscar en la tienda"
          placeholderTextColor={colors.textSecondary}
          style={[styles.buscadorInput, { color: colors.text }]}
          returnKeyType="search"
          autoCorrect={false}
        />
        {busqueda ? (
          <AnimatedPressable onPress={() => setBusqueda('')} hitSlop={10} haptic={false}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </AnimatedPressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {[{ handle: '', nombre: 'Todo' }, ...categorias].map((c) => {
          const activa = (categoria ?? '') === c.handle;
          return (
            <AnimatedPressable
              key={c.handle || 'todo'}
              onPress={() => setCategoria(c.handle || null)}
              haptic={false}
              style={[
                styles.chip,
                { borderColor: activa ? brand.primary : colors.border, backgroundColor: activa ? brand.primary + '1A' : colors.surface },
              ]}>
              <Text style={[styles.chipTexto, { color: activa ? brand.primary : colors.text }]}>{c.nombre}</Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {error ? (
        <Text style={[styles.error, { color: brand.danger }]}>{error}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={productos ?? []}
        keyExtractor={(p) => p.id}
        numColumns={2}
        columnWrapperStyle={{ gap: Spacing.md }}
        contentContainerStyle={[styles.lista, articulos > 0 && { paddingBottom: 110 }]}
        ListHeaderComponent={encabezado}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}
        ListEmptyComponent={
          productos == null ? (
            <ActivityIndicator color={brand.primary} style={{ marginTop: Spacing.xxl }} />
          ) : (
            <Text style={[styles.sinResultados, { color: colors.textSecondary }]}>
              {busqueda || categoria ? 'No encontramos productos con ese filtro.' : 'Tu gimnasio todavía no publica productos.'}
            </Text>
          )
        }
        renderItem={({ item }) => <TarjetaProducto producto={item} />}
        keyboardShouldPersistTaps="handled"
      />

      {comprador && articulos > 0 && carrito ? (
        <AnimatedPressable
          onPress={() => router.push('/carrito')}
          style={[styles.barraCarrito, Shadow.brand, { backgroundColor: brand.primary }]}>
          <Ionicons name="cart" size={20} color={onPrimary} />
          <Text style={[styles.barraTexto, { color: onPrimary }]}>
            Ver carrito · {articulos} {articulos === 1 ? 'artículo' : 'artículos'}
          </Text>
          <Text style={[styles.barraTotal, { color: onPrimary }]}>{dinero(carrito.total)}</Text>
        </AnimatedPressable>
      ) : null}
    </SafeAreaView>
  );
}

function TarjetaProducto({ producto }: { producto: Producto }) {
  const { colors, brand } = useTheme();
  const imagen = urlImagen(producto.imagen);
  const esPlan = producto.tipo === 'membresia';
  return (
    <AnimatedPressable
      onPress={() => router.push({ pathname: '/producto/[id]', params: { id: producto.id } })}
      scaleTo={0.97}
      haptic={false}
      style={{ flex: 1 }}>
      <Card padded={false} style={styles.tarjeta}>
        <View style={[styles.imagenCaja, { backgroundColor: colors.surfaceMuted }]}>
          {imagen ? (
            <Image source={{ uri: imagen }} style={styles.imagen} resizeMode="cover" />
          ) : (
            <Ionicons name={esPlan ? 'ribbon-outline' : 'cube-outline'} size={34} color={colors.textSecondary} />
          )}
          {producto.agotado ? (
            <View style={styles.etiqueta}>
              <Badge label="Agotado" tone="danger" />
            </View>
          ) : esPlan && producto.plan?.destacado ? (
            <View style={styles.etiqueta}>
              <Badge label="Destacado" tone="brand" />
            </View>
          ) : null}
        </View>
        <View style={styles.tarjetaCuerpo}>
          <Text style={[styles.tarjetaNombre, { color: colors.text }]} numberOfLines={2}>
            {producto.nombre}
          </Text>
          {producto.calificacion ? (
            <Estrellas promedio={producto.calificacion.promedio} total={producto.calificacion.total} size={12} />
          ) : null}
          <Text style={[styles.tarjetaPrecio, { color: brand.primaryDark }]}>
            {producto.variantes.length > 1 ? 'Desde ' : ''}
            {dinero(producto.precioDesde)}
          </Text>
          {esPlan && producto.plan ? (
            <Text style={[styles.tarjetaMeta, { color: colors.textSecondary }]}>{producto.plan.duracionTexto}</Text>
          ) : null}
        </View>
      </Card>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  vacio: { padding: Spacing.xl },
  lista: { padding: Spacing.xl, gap: Spacing.md },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, paddingVertical: Spacing.md },
  avisoTexto: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    height: 46,
  },
  buscadorInput: { flex: 1, fontFamily: FontFamily.regular, fontSize: 14.5, height: '100%' },
  chips: { gap: Spacing.sm, paddingRight: Spacing.xl },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.lg, paddingVertical: 7 },
  chipTexto: { fontFamily: FontFamily.medium, fontSize: 13 },
  error: { fontSize: 13, fontFamily: FontFamily.medium },
  sinResultados: { textAlign: 'center', marginTop: Spacing.xxl, fontSize: 13.5 },
  tarjeta: { flex: 1 },
  imagenCaja: { height: 130, alignItems: 'center', justifyContent: 'center' },
  imagen: { width: '100%', height: '100%' },
  etiqueta: { position: 'absolute', top: Spacing.sm, left: Spacing.sm },
  tarjetaCuerpo: { padding: Spacing.md, gap: 4 },
  tarjetaNombre: { fontFamily: FontFamily.semiBold, fontSize: 13.5, lineHeight: 18 },
  tarjetaPrecio: { fontFamily: FontFamily.bold, fontSize: 15 },
  tarjetaMeta: { fontSize: 11.5 },
  barraCarrito: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    bottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 15,
  },
  barraTexto: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 14.5 },
  barraTotal: { fontFamily: FontFamily.bold, fontSize: 15 },
});
