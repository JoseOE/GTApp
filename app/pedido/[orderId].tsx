import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { StateCard } from '@/components/ui/StateCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ImagenProtegida } from '@/components/ui/ImagenProtegida';
import { Desglose } from '@/components/tienda/Desglose';
import { EntregaBadge, EstadoBadge } from '@/components/tienda/EstadoPedido';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { dinero, fechaLarga } from '@/lib/formato';
import { fetchPedido, rutaQrPedido, type Pedido } from '@/lib/tienda';

// Mientras el pedido espera a que lo recojan, se revisa solo cada tanto: en
// cuanto recepción escanea el QR, la pantalla pasa a "Entregado".
const REVISAR_CADA_MS = 15000;

export default function PedidoScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { colors, brand } = useTheme();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    if (!orderId) return;
    try {
      setPedido(await fetchPedido(orderId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el pedido.');
    }
  }, [orderId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const esperando = pedido?.entrega?.estado === 'pendiente' || pedido?.estado === 'pendiente_pago';
  useEffect(() => {
    if (!esperando) return;
    const t = setInterval(cargar, REVISAR_CADA_MS);
    return () => clearInterval(t);
  }, [esperando, cargar]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  if (!pedido) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {error ? (
            <StateCard icon="alert-circle-outline" tone="danger" title="No se pudo abrir" message={error} actionLabel="Reintentar" onAction={cargar} />
          ) : (
            <ActivityIndicator color={brand.primary} style={{ marginTop: Spacing.xxl }} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const pagado = pedido.estado === 'pagado';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: `Pedido #${pedido.folio}` }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}>
        <View style={{ gap: Spacing.xs }}>
          <View style={styles.badges}>
            <EstadoBadge pedido={pedido} />
            <EntregaBadge pedido={pedido} />
          </View>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Comprado el {fechaLarga(pedido.creadoEn, true)}
            {pedido.gym ? ` en ${pedido.gym.nombre}` : ''}
          </Text>
        </View>

        {pedido.entrega?.estado === 'pendiente' ? (
          <Card style={styles.recoger}>
            <Text style={[styles.recogerTitulo, { color: colors.text }]}>Recoge tus productos</Text>
            <Text style={[styles.recogerTexto, { color: colors.textSecondary }]}>
              Muestra este código en la recepción{pedido.gym ? ` de ${pedido.gym.nombre}` : ''}. Lo escanean y te entregan tu pedido.
            </Text>
            <View style={styles.qrMarco}>
              <ImagenProtegida ruta={rutaQrPedido(pedido.orderId)} style={styles.qr} accessibilityLabel="Código QR para recoger el pedido" />
            </View>
            <Text style={[styles.folioGrande, { color: colors.text }]}>#{pedido.folio}</Text>
            {pedido.gym?.direccion ? (
              <View style={styles.direccion}>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.meta, { color: colors.textSecondary, flex: 1 }]}>{pedido.gym.direccion}</Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        {pedido.entrega?.estado === 'entregado' ? (
          <Card style={[styles.entregado, { borderColor: brand.success }]}>
            <Ionicons name="checkmark-circle" size={22} color={brand.success} />
            <Text style={[styles.entregadoTexto, { color: colors.text }]}>
              Entregado{pedido.entrega.entregadoEn ? ` el ${fechaLarga(pedido.entrega.entregadoEn, true)}` : ''}
            </Text>
          </Card>
        ) : null}

        <Card padded={false}>
          {pedido.partidas.map((p, i) => (
            <View
              key={`${p.productoId}-${i}`}
              style={[styles.partida, i < pedido.partidas.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.titulo, { color: colors.text }]}>{p.titulo}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {p.variante ? `${p.variante} · ` : ''}
                  {p.cantidad} × {dinero(p.precioUnitario)}
                </Text>
                {/* Solo quien pagó puede calificar; los planes no llevan reseña. */}
                {pagado && p.tipo === 'producto' ? (
                  <AnimatedPressable
                    haptic={false}
                    onPress={() =>
                      router.push({ pathname: '/producto/[id]', params: { id: p.productoId, resenar: '1' } })
                    }
                    style={styles.calificar}>
                    <Ionicons name="star-outline" size={14} color={brand.primaryDark} />
                    <Text style={[styles.calificarTexto, { color: brand.primaryDark }]}>Califica tu compra</Text>
                  </AnimatedPressable>
                ) : null}
              </View>
              <Text style={[styles.titulo, { color: colors.text }]}>{dinero(p.total)}</Text>
            </View>
          ))}
        </Card>

        <Desglose carrito={pedido} />

        <Card style={{ gap: 2 }}>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>Forma de pago</Text>
          <Text style={[styles.titulo, { color: colors.text }]}>{pedido.metodo}</Text>
          {pedido.detallePago ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>{pedido.detallePago}</Text>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  badges: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  meta: { fontSize: 12.5, lineHeight: 17 },
  recoger: { alignItems: 'center', gap: Spacing.sm },
  recogerTitulo: { fontFamily: FontFamily.bold, fontSize: 18 },
  recogerTexto: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  qrMarco: { backgroundColor: '#FFFFFF', borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
  qr: { width: 240, height: 240 },
  folioGrande: { fontFamily: FontFamily.extraBold, fontSize: 26, letterSpacing: 1 },
  direccion: { flexDirection: 'row', gap: 4, alignItems: 'flex-start' },
  entregado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5 },
  entregadoTexto: { flex: 1, fontFamily: FontFamily.semiBold, fontSize: 14 },
  partida: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  titulo: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  calificar: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.xs, alignSelf: 'flex-start' },
  calificarTexto: { fontFamily: FontFamily.semiBold, fontSize: 12.5 },
});
