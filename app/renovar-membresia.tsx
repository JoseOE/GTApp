import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { StateCard } from '@/components/ui/StateCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { useCarrito } from '@/lib/CarritoContext';
import { dinero } from '@/lib/formato';
import { fechaVencimiento, fetchRenovacion, prepararRenovacion, type Renovacion } from '@/lib/renovacion';
import { ResultadoRenovacion } from '@/components/renovacion/ResultadoRenovacion';

// Al volver del pago, si todavía no se ve renovada, se pregunta otra vez
// cada 2 s unas cuantas veces (el pago con tarjeta o PayPal tarda un momento).
const REINTENTOS = 5;

// "4:07" a partir de los milisegundos que faltan.
function reloj(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Renovar la membresía. La abre el push que llega cuando el lector de la
// puerta niega la entrada porque venció: si se paga mientras la alerta sigue
// vigente (10 minutos), la puerta se abre sola en cuanto se confirma el pago.
export default function RenovarMembresiaScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const { carrito, reemplazar } = useCarrito();
  const [datos, setDatos] = useState<Renovacion | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sinPlanes, setSinPlanes] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [ahora, setAhora] = useState(Date.now());
  // pagado=1: viene del checkout de la renovación (metodo, orderId del pedido).
  const { pagado, metodo, orderId } = useLocalSearchParams<{ pagado?: string; metodo?: string; orderId?: string }>();
  const volvioDelPago = pagado === '1';
  const [intentos, setIntentos] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const d = await fetchRenovacion();
      setDatos(d);
      setError(null);
      // El sugerido va preseleccionado; si el elegido ya no está, se vuelve a él.
      setElegido((actual) =>
        actual && d.planes.some((p) => p.id === actual) ? actual : d.plan?.id ?? d.planes[0]?.id ?? null
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu membresía.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // La cuenta regresiva de la puerta: cada segundo, y al llegar a cero se
  // vuelve a preguntar (la alerta pasa a EXPIRADA).
  const puerta = datos?.puerta ?? null;
  const pendiente = puerta?.estado === 'PENDIENTE';
  const restante = pendiente && puerta ? new Date(puerta.venceEn).getTime() - ahora : 0;
  useEffect(() => {
    if (!pendiente) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pendiente]);
  useEffect(() => {
    if (pendiente && restante <= 0) cargar();
  }, [pendiente, restante <= 0, cargar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras el pago se confirma: la puerta todavía no se ve abierta y la
  // membresía sigue vencida.
  const esperandoConfirmacion =
    volvioDelPago && metodo !== 'paynet' && !!datos && datos.vencida && !(datos.puerta?.estado === 'APROBADA');
  useEffect(() => {
    if (!esperandoConfirmacion || intentos >= REINTENTOS) return;
    const t = setTimeout(() => {
      setIntentos((n) => n + 1);
      cargar();
    }, 2000);
    return () => clearTimeout(t);
  }, [esperandoConfirmacion, intentos, cargar]);

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  async function renovarYPagar() {
    if (!elegido) return;
    setPreparando(true);
    setAviso(null);
    try {
      const r = await prepararRenovacion(elegido);
      // El carrito de la app ya trae solo el plan: se paga con el checkout de siempre.
      reemplazar(r.carrito);
      router.push({ pathname: '/checkout', params: { renovacion: '1' } });
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('No se pudo preparar la renovación. Inténtalo de nuevo.');
      if (e.status === 409) setSinPlanes(e.message);
      else if (e.status === 404) {
        // El plan dejó de venderse: se recarga la lista.
        setAviso(e.message);
        await cargar();
      } else setAviso(e.message);
    } finally {
      setPreparando(false);
    }
  }

  const telefono = account?.gym?.telefono?.trim();
  const sinPlanesMensaje = sinPlanes ?? (datos && datos.vencida && datos.planes.length === 0 ? 'Tu gimnasio no tiene planes a la venta en la app. Renueva en recepción.' : null);

  if (!datos) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {error ? (
            <StateCard icon="alert-circle-outline" tone="danger" title="No se pudo abrir" message={error} actionLabel="Reintentar" actionIcon="refresh-outline" onAction={cargar} />
          ) : (
            <ActivityIndicator color={brand.primary} style={{ marginTop: Spacing.xxl }} />
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (volvioDelPago) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}>
          <ResultadoRenovacion datos={datos} metodo={metodo} orderId={orderId} confirmando={esperandoConfirmacion && intentos < REINTENTOS} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (sinPlanesMensaje) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StateCard icon="storefront-outline" tone="warning" title="Renueva en recepción" message={sinPlanesMensaje} />
          {telefono ? (
            <PrimaryButton label="Llamar al gimnasio" icon="call" onPress={() => Linking.openURL(`tel:${telefono.replace(/[^\d+]/g, '')}`)} />
          ) : null}
          <PrimaryButton label="Ver dónde está recepción" icon="location-outline" variant="outline" onPress={() => router.push('/mi-gimnasio')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const fecha = fechaVencimiento(datos.fechaProximoPago);
  const planElegido = datos.planes.find((p) => p.id === elegido) ?? datos.plan;
  // El carrito se vacía para pagar solo la renovación: se avisa antes.
  const otrosEnCarrito = (carrito?.items ?? []).some((i) => !(i.esPlan && i.productoId === elegido));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}>
        <View style={styles.cabeza}>
          <IconCircle name={datos.vencida ? 'card' : 'checkmark-circle'} tone={datos.vencida ? 'warning' : 'success'} size={56} />
          <Text style={[Type.title, styles.centro, { color: colors.text }]}>
            {datos.vencida ? (fecha ? `Tu membresía venció el ${fecha}` : 'Tu membresía venció') : 'Tu membresía está al día'}
          </Text>
          {account?.gym ? <Text style={[Type.footnote, { color: colors.textSecondary }]}>{account.gym.nombre}</Text> : null}
        </View>

        {datos.vencida ? (
          <>
            <PuertaAviso datos={datos} restante={restante} />

            <View style={{ gap: Spacing.sm }}>
              <Text style={[Type.overline, styles.rotulo, { color: colors.textSecondary }]}>TU PLAN</Text>
              <View style={[styles.lista, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {datos.planes.map((p, i) => {
                  const activo = p.id === elegido;
                  return (
                    <AnimatedPressable
                      key={p.id}
                      onPress={() => setElegido(p.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activo }}
                      style={[styles.plan, i < datos.planes.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                      <Ionicons name={activo ? 'radio-button-on' : 'radio-button-off'} size={22} color={activo ? brand.primary : colors.textSecondary} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={styles.planNombre}>
                          <Text style={[Type.headline, { color: colors.text }]}>{p.nombre}</Text>
                          {p.id === datos.plan?.id ? <Badge label="Sugerido" tone="brand" /> : null}
                        </View>
                        <Text style={[Type.footnote, { color: colors.textSecondary }]}>{p.duracionTexto}</Text>
                      </View>
                      <Text style={[Type.headline, { color: colors.text }]}>{dinero(p.precio)}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>

            {otrosEnCarrito ? (
              <View style={[styles.nota, { backgroundColor: brand.warning + '14', borderColor: brand.warning + '55' }]}>
                <Ionicons name="cart-outline" size={18} color={brand.warning} />
                <Text style={[Type.footnote, { color: colors.text, flex: 1 }]}>
                  Tu carrito se vaciará para pagar la renovación.
                </Text>
              </View>
            ) : null}

            {aviso ? <Text style={[Type.callout, { color: brand.danger }]}>{aviso}</Text> : null}

            <PrimaryButton
              label={planElegido ? `Renovar y pagar · ${dinero(planElegido.precio)}` : 'Renovar y pagar'}
              icon="card"
              onPress={renovarYPagar}
              loading={preparando}
              disabled={!elegido}
            />
            <Text style={[Type.caption, styles.centro, { color: colors.textSecondary }]}>
              Pagas con tarjeta, PayPal o efectivo en tienda. Con efectivo en tienda la puerta no se abre en el
              momento: tu membresía se renueva cuando se registre el pago.
            </Text>
          </>
        ) : (
          <Card style={{ gap: Spacing.md }}>
            <Text style={[Type.body, { color: colors.text }]}>Tu membresía está al día. Pasa tu tarjeta en la puerta.</Text>
            <PrimaryButton label="Ir a Inicio" icon="home-outline" variant="outline" onPress={() => router.navigate('/(tabs)')} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Qué pasa con la puerta: si la alerta sigue esperando, la cuenta regresiva;
// si no, que al pagar vuelva a pasar la tarjeta.
function PuertaAviso({ datos, restante }: { datos: Renovacion; restante: number }) {
  const { colors, brand } = useTheme();
  const puerta = datos.puerta;

  if (puerta?.estado === 'PENDIENTE' && restante > 0) {
    return (
      <View style={[styles.puerta, { borderColor: brand.primary + '55' }]}>
        <Text style={[Type.overline, { color: brand.primary }]}>{puerta.lector ? puerta.lector.toUpperCase() : 'LA PUERTA'} TE ESPERA</Text>
        <Text style={[Type.stat, styles.reloj]} accessibilityLabel={`Quedan ${reloj(restante)} minutos`}>
          {reloj(restante)}
        </Text>
        <Text style={[Type.footnote, styles.puertaTexto]}>
          Paga en los próximos {reloj(restante)} y la puerta se abre sola.
        </Text>
      </View>
    );
  }

  if (puerta?.estado === 'APROBADA') {
    return (
      <View style={[styles.nota, { backgroundColor: brand.success + '14', borderColor: brand.success + '55' }]}>
        <Ionicons name="lock-open-outline" size={18} color={brand.success} />
        <Text style={[Type.footnote, { color: colors.text, flex: 1 }]}>Recepción ya te abrió la puerta.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.nota, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name="card-outline" size={18} color={colors.textSecondary} />
      <Text style={[Type.footnote, { color: colors.text, flex: 1 }]}>Al pagar, vuelve a pasar tu tarjeta.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  cabeza: { alignItems: 'center', gap: Spacing.sm },
  centro: { textAlign: 'center' },
  rotulo: { marginLeft: Spacing.lg },
  lista: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  planNombre: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  nota: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md },
  // La cuenta regresiva va en la tarjeta oscura "deportiva", como la del día en Inicio.
  puerta: { backgroundColor: '#141417', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: 2 },
  reloj: { color: '#FFFFFF', fontSize: 48, lineHeight: 54 },
  puertaTexto: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
