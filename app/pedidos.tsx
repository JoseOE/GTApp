import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { StateCard } from '@/components/ui/StateCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { EntregaBadge, EstadoBadge } from '@/components/tienda/EstadoPedido';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { dinero, fechaLarga } from '@/lib/formato';
import { fetchPedidos, type Pedido } from '@/lib/tienda';

// Mis pedidos: lo comprado en la tienda (app y web), del más nuevo al más viejo.
export default function PedidosScreen() {
  const { colors, brand } = useTheme();
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setPedidos(await fetchPedidos());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus pedidos.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={pedidos ?? []}
        keyExtractor={(p) => p.orderId}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}
        ListHeaderComponent={error ? <Text style={[styles.error, { color: brand.danger }]}>{error}</Text> : null}
        ListEmptyComponent={
          pedidos == null ? (
            error ? null : <ActivityIndicator color={brand.primary} style={{ marginTop: Spacing.xxl }} />
          ) : (
            <StateCard
              icon="receipt-outline"
              tone="muted"
              title="Aún no tienes pedidos"
              message="Lo que compres en la tienda de tu gimnasio aparecerá aquí, con el QR para recogerlo."
              actionLabel="Ir a la tienda"
              actionIcon="bag-handle-outline"
              onAction={() => router.navigate('/(tabs)/tienda')}
            />
          )
        }
        renderItem={({ item }) => <TarjetaPedido pedido={item} />}
      />
    </SafeAreaView>
  );
}

function TarjetaPedido({ pedido }: { pedido: Pedido }) {
  const { colors } = useTheme();
  const articulos = pedido.partidas.reduce((n, p) => n + p.cantidad, 0);
  const resumen = pedido.partidas.map((p) => p.titulo).join(', ');
  return (
    <AnimatedPressable
      haptic={false}
      scaleTo={0.98}
      onPress={() => router.push({ pathname: '/pedido/[orderId]', params: { orderId: pedido.orderId } })}>
      <Card style={{ gap: Spacing.sm }}>
        <View style={styles.fila}>
          <Text style={[styles.folio, { color: colors.text }]}>Pedido #{pedido.folio}</Text>
          <Text style={[styles.total, { color: colors.text }]}>{dinero(pedido.total)}</Text>
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {fechaLarga(pedido.creadoEn)} · {articulos} {articulos === 1 ? 'artículo' : 'artículos'} · {pedido.metodo}
        </Text>
        <Text style={[styles.resumen, { color: colors.text }]} numberOfLines={1}>
          {resumen}
        </Text>
        <View style={styles.badges}>
          <EstadoBadge pedido={pedido} />
          <EntregaBadge pedido={pedido} />
          <View style={{ flex: 1 }} />
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </View>
      </Card>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lista: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  error: { fontFamily: FontFamily.medium, fontSize: 13, marginBottom: Spacing.sm },
  fila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  folio: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  total: { fontFamily: FontFamily.bold, fontSize: 15 },
  meta: { fontSize: 12 },
  resumen: { fontSize: 13 },
  badges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
});
