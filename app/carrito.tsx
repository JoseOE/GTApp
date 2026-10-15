import { useCallback, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { StateCard } from '@/components/ui/StateCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Avisos, Desglose } from '@/components/tienda/Desglose';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { useCarrito } from '@/lib/CarritoContext';
import { dinero, urlImagen } from '@/lib/formato';
import { vaciarCarrito, type PartidaCarrito } from '@/lib/tienda';

export default function CarritoScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const { carrito, recargar, cambiar, quitar, reemplazar } = useCarrito();
  const [refrescando, setRefrescando] = useState(false);
  const [ocupada, setOcupada] = useState<string | null>(null);

  // Al abrirlo se revisa contra el servidor: si algo se agotó o cambió de
  // precio, ya viene corregido y "avisos" dice qué cambió.
  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  async function conPartida(partidaId: string, accion: () => Promise<void>) {
    setOcupada(partidaId);
    try {
      await accion();
    } catch (err) {
      Alert.alert('No se pudo actualizar', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
      recargar();
    } finally {
      setOcupada(null);
    }
  }

  function confirmarVaciar() {
    Alert.alert('Vaciar carrito', '¿Quitamos todos los productos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Vaciar',
        style: 'destructive',
        onPress: async () => {
          try {
            reemplazar(await vaciarCarrito());
          } catch (err) {
            Alert.alert('No se pudo vaciar', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  }

  async function refrescar() {
    setRefrescando(true);
    await recargar();
    setRefrescando(false);
  }

  const vacio = !carrito || carrito.items.length === 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}>
        {carrito?.avisos.length ? <Avisos avisos={carrito.avisos} /> : null}

        {vacio ? (
          <StateCard
            icon="cart-outline"
            tone="muted"
            title="Tu carrito está vacío"
            message={`Agrega productos de la tienda de ${account?.gym?.nombre ?? 'tu gimnasio'} y recógelos en recepción.`}
            actionLabel="Ir a la tienda"
            actionIcon="bag-handle-outline"
            onAction={() => router.navigate('/(tabs)/tienda')}
          />
        ) : (
          <>
            <Card padded={false}>
              {carrito.items.map((p, i) => (
                <Partida
                  key={p.id}
                  partida={p}
                  ocupada={ocupada === p.id}
                  ultima={i === carrito.items.length - 1}
                  onCantidad={(n) => conPartida(p.id, () => cambiar(p.id, n))}
                  onQuitar={() => conPartida(p.id, () => quitar(p.id))}
                />
              ))}
            </Card>

            <Desglose carrito={carrito} />

            <View style={styles.recoger}>
              <Ionicons name="storefront-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.nota, { color: colors.textSecondary }]}>
                Pagas desde aquí y recoges en la recepción de {account?.gym?.nombre ?? 'tu gimnasio'} mostrando el QR de tu pedido.
              </Text>
            </View>

            <AnimatedPressable onPress={confirmarVaciar} haptic={false} style={styles.vaciar}>
              <Text style={[styles.vaciarTexto, { color: brand.danger }]}>Vaciar carrito</Text>
            </AnimatedPressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Partida({
  partida,
  ocupada,
  ultima,
  onCantidad,
  onQuitar,
}: {
  partida: PartidaCarrito;
  ocupada: boolean;
  ultima: boolean;
  onCantidad: (n: number) => void;
  onQuitar: () => void;
}) {
  const { colors, brand } = useTheme();
  const imagen = urlImagen(partida.imagen);
  return (
    <View
      style={[
        styles.partida,
        !ultima && { borderBottomWidth: 1, borderBottomColor: colors.border },
        { opacity: ocupada ? 0.5 : 1 },
      ]}>
      <AnimatedPressable
        haptic={false}
        onPress={() => router.push({ pathname: '/producto/[id]', params: { id: partida.productoId } })}
        style={[styles.miniatura, { backgroundColor: colors.surfaceMuted }]}>
        {imagen ? (
          <Image source={{ uri: imagen }} style={styles.miniaturaImg} />
        ) : (
          <Ionicons name={partida.esPlan ? 'ribbon-outline' : 'cube-outline'} size={22} color={colors.textSecondary} />
        )}
      </AnimatedPressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.titulo, { color: colors.text }]} numberOfLines={2}>
          {partida.titulo}
        </Text>
        {partida.variante ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{partida.variante}</Text>
        ) : null}
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{dinero(partida.precioUnitario)} c/u</Text>
        <View style={styles.controles}>
          {partida.esPlan ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]}>1 membresía</Text>
          ) : (
            <View style={styles.cantidad}>
              <Paso icon="remove" disabled={ocupada || partida.cantidad <= 1} onPress={() => onCantidad(partida.cantidad - 1)} />
              <Text style={[styles.cantidadNumero, { color: colors.text }]}>{partida.cantidad}</Text>
              <Paso icon="add" disabled={ocupada || partida.cantidad >= partida.maximo} onPress={() => onCantidad(partida.cantidad + 1)} />
            </View>
          )}
          <AnimatedPressable onPress={onQuitar} disabled={ocupada} hitSlop={8} accessibilityLabel="Quitar del carrito">
            <Ionicons name="trash-outline" size={19} color={brand.danger} />
          </AnimatedPressable>
        </View>
      </View>
      <Text style={[styles.totalPartida, { color: colors.text }]}>{dinero(partida.total)}</Text>
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
      <Ionicons name={icon} size={16} color={colors.text} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  partida: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg },
  miniatura: { width: 58, height: 58, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  miniaturaImg: { width: '100%', height: '100%' },
  titulo: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  meta: { fontSize: 12 },
  controles: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xs },
  cantidad: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  cantidadNumero: { fontFamily: FontFamily.semiBold, fontSize: 14, minWidth: 18, textAlign: 'center' },
  paso: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  totalPartida: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  recoger: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  nota: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  vaciar: { alignSelf: 'center', padding: Spacing.sm },
  vaciarTexto: { fontFamily: FontFamily.medium, fontSize: 13.5 },
});
