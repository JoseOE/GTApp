import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { StateCard } from '@/components/ui/StateCard';
import { ErrorBox } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Avisos, Desglose } from '@/components/tienda/Desglose';
import { FilaLogos, type Logo } from '@/components/checkout/LogoPago';
import { MetodoTarjeta } from '@/components/checkout/MetodoTarjeta';
import { ModalAdvertencia } from '@/components/checkout/ModalAdvertencia';
import { ModalConfirmar } from '@/components/checkout/ModalConfirmar';
import { TIENDAS_EFECTIVO } from '@/components/tienda/FichaPaynet';
import { MetodoPaypal } from '@/components/checkout/MetodoPaypal';
import { aprobarEnPaypal } from '@/lib/paypal';
import { pagarEnStripe } from '@/lib/stripe';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { useCarrito } from '@/lib/CarritoContext';
import { dinero } from '@/lib/formato';
import {
  fetchVendedor,
  pagarCarrito,
  TERMINOS_VERSION,
  urlPrivacidad,
  urlTerminos,
  type Carrito,
  type Consentimiento,
  type MetodoPago,
  type SimulacionPaypal,
  type Vendedor,
} from '@/lib/tienda';

type Metodo = { id: MetodoPago; titulo: string; descripcion: string; logos: Logo[] };

// Formas de pago de la app, con las APIs reales en su modo de prueba. El
// efectivo en mano es solo en el mostrador del gimnasio.
const METODOS: Metodo[] = [
  {
    id: 'stripe',
    titulo: 'Tarjeta de crédito o débito',
    descripcion: 'Visa, Mastercard o American Express en la página segura de Stripe.',
    logos: ['visa', 'mastercard', 'amex'],
  },
  {
    id: 'paypal',
    titulo: 'PayPal',
    descripcion: 'Apruebas el pago en la página de PayPal y regresas a la app.',
    logos: ['paypal'],
  },
  {
    id: 'paynet',
    titulo: 'Efectivo en tiendas',
    descripcion: 'Te damos una ficha de Paynet con código de barras; tienes 72 horas para pagarla.',
    logos: TIENDAS_EFECTIVO,
  },
];

type Paso = null | 'advertencia' | 'confirmar';

export default function CheckoutScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const { carrito, recargar, reemplazar } = useCarrito();
  const gymId = account?.gymId ?? '';
  const gymNombre = account?.gym?.nombre ?? 'tu gimnasio';

  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [metodo, setMetodo] = useState<MetodoPago>('stripe');
  // Solo en pruebas: cómo responde PayPal al cobrar (ver MetodoPaypal).
  const [simularPaypal, setSimularPaypal] = useState<SimulacionPaypal>('aprobado');
  const [paso, setPaso] = useState<Paso>(null);
  const [aceptoAdvertencia, setAceptoAdvertencia] = useState(false);
  const [avisoTerminos, setAvisoTerminos] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      recargar();
    }, [recargar])
  );

  useEffect(() => {
    if (gymId) fetchVendedor(gymId).then(setVendedor).catch(() => {});
  }, [gymId]);

  if (!carrito || carrito.items.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StateCard
            icon="cart-outline"
            tone="muted"
            title="No hay nada que pagar"
            message="Tu carrito está vacío."
            actionLabel="Ir a la tienda"
            onAction={() => router.navigate('/(tabs)/tienda')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const total = carrito.total;
  // Productos que piden aceptar la advertencia sanitaria (sin repetir).
  const conAdvertencia = [...new Set(carrito.items.filter((i) => i.requiereAdvertencia).map((i) => i.titulo))];
  const razon = vendedor?.razonSocial || vendedor?.nombre || gymNombre;
  function formaDePago(): string {
    if (metodo === 'stripe') return 'Tarjeta (la pagas en la página de Stripe)';
    if (metodo === 'paypal') return 'PayPal (lo apruebas en la página de PayPal)';
    return METODOS.find((m) => m.id === metodo)?.titulo ?? '';
  }

  // Lo que el método manda al servidor. null = la persona canceló a medio camino.
  // La confirmación y el consentimiento ya se dieron antes de salir a Stripe o
  // a PayPal. Se espera a que cierre la hoja de confirmación: iOS no abre el
  // navegador mientras otra vista se está cerrando.
  async function datosDelMetodo(): Promise<Record<string, unknown> | null> {
    if (metodo === 'stripe') {
      await new Promise((listo) => setTimeout(listo, 400));
      const r = await pagarEnStripe();
      if (!r.pagado) {
        setError('Cancelaste el pago con tarjeta. No se hizo ningún cargo.');
        return null;
      }
      return { sesion: r.sesion };
    }
    if (metodo === 'paypal') {
      await new Promise((listo) => setTimeout(listo, 400));
      const r = await aprobarEnPaypal();
      if (!r.aprobado) {
        setError('Cancelaste el pago en PayPal. No se hizo ningún cargo.');
        return null;
      }
      return { token: r.token, payerId: r.payerId, ...(simularPaypal !== 'aprobado' ? { simular: simularPaypal } : {}) };
    }
    return {};
  }

  function iniciarPago() {
    setError(null);
    setAvisoTerminos(null);
    setAceptoAdvertencia(false);
    setPaso(conAdvertencia.length ? 'advertencia' : 'confirmar');
  }

  async function pagar() {
    setPaso(null);
    const consentimiento: Consentimiento = {
      terminosVersion: TERMINOS_VERSION,
      aceptaTerminos: true,
      aceptaAdvertencia: conAdvertencia.length > 0 && aceptoAdvertencia,
    };
    setProcesando(true);
    setError(null);
    try {
      const datos = await datosDelMetodo();
      if (!datos) return;
      const pedido = await pagarCarrito(metodo, datos, total, consentimiento);
      // El carrito ya se pagó: el siguiente producto abre uno nuevo.
      await recargar();
      router.replace({ pathname: '/pedido/[orderId]', params: { orderId: pedido.orderId } });
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('No se pudo completar el pago. Inténtalo de nuevo.');
      if (e.status === 409 && e.data.carrito) {
        // Cambió un precio o se agotó algo: el carrito ya viene corregido.
        reemplazar(e.data.carrito as Carrito);
        setError(e.message);
      } else if (e.status === 409 && (e.data.terminosCambiaron === true || /términos/i.test(e.message))) {
        // Los términos de compra cambiaron: se muestran otra vez.
        setAvisoTerminos(e.message);
        setPaso('confirmar');
      } else if (e.status === 409) {
        // Otro 409 (el pago ya se está procesando, el carrito cambió en otra
        // sesión, PayPal aprobó otro total): el mensaje y el carrito al día.
        setError(e.message);
        await recargar();
      } else {
        // 400 (falta algo) y 402 (pago rechazado): el mensaje tal cual.
        // No se cobró nada: "Pagar" vuelve a abrir Stripe o PayPal.
        setError(e.message);
      }
    } finally {
      setProcesando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {carrito.avisos.length ? <Avisos avisos={carrito.avisos} /> : null}

          <Text style={[styles.seccion, { color: colors.text }]}>Tu pedido</Text>
          <Card style={{ gap: Spacing.xs }}>
            {carrito.items.map((i) => (
              <View key={i.id} style={styles.partida}>
                <Text style={[styles.partidaTexto, { color: colors.text }]} numberOfLines={1}>
                  {i.cantidad} × {i.titulo}
                </Text>
                <Text style={[styles.partidaTexto, { color: colors.text }]}>{dinero(i.total)}</Text>
              </View>
            ))}
          </Card>
          <Desglose carrito={carrito} />

          <Text style={[styles.seccion, { color: colors.text }]}>Forma de pago</Text>
          <View style={{ gap: Spacing.sm }}>
            {METODOS.map((m) => {
              const activo = metodo === m.id;
              return (
                <AnimatedPressable
                  key={m.id}
                  onPress={() => {
                    setMetodo(m.id);
                    setError(null);
                  }}
                  haptic={false}
                  scaleTo={0.98}
                  style={[
                    styles.metodo,
                    { backgroundColor: colors.surface, borderColor: activo ? brand.primary : colors.border },
                  ]}>
                  <View style={styles.metodoCabeza}>
                    <Ionicons
                      name={activo ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={activo ? brand.primary : colors.textSecondary}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.metodoTitulo, { color: colors.text }]}>{m.titulo}</Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]}>{m.descripcion}</Text>
                    </View>
                  </View>
                  <FilaLogos logos={m.logos} alto={22} />
                </AnimatedPressable>
              );
            })}
          </View>

          {metodo === 'stripe' ? (
            <Card>
              <MetodoTarjeta />
            </Card>
          ) : null}

          {metodo === 'paypal' ? (
            <Card>
              <MetodoPaypal simular={simularPaypal} onSimular={setSimularPaypal} />
            </Card>
          ) : null}

          {error ? <ErrorBox message={error} /> : null}

          <PrimaryButton label={`Pagar ${dinero(total)}`} icon="lock-closed" onPress={iniciarPago} loading={procesando} />
          <Text style={[styles.nota, { color: colors.textSecondary }]}>
            Al confirmar tu compra aceptas los{' '}
            <Text style={[styles.enlace, { color: brand.primaryDark }]} onPress={() => WebBrowser.openBrowserAsync(urlTerminos(gymId))}>
              Términos y condiciones de compra
            </Text>{' '}
            y el{' '}
            <Text style={[styles.enlace, { color: brand.primaryDark }]} onPress={() => WebBrowser.openBrowserAsync(urlPrivacidad(gymId))}>
              Aviso de privacidad
            </Text>{' '}
            de {razon.replace(/\.$/, '')}. Pagos en modo de prueba (sandbox): no se cobra dinero real.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ModalAdvertencia
        visible={paso === 'advertencia'}
        productos={conAdvertencia}
        gymId={gymId}
        onCancelar={() => setPaso(null)}
        onAceptar={() => {
          setAceptoAdvertencia(true);
          setPaso('confirmar');
        }}
      />
      <ModalConfirmar
        visible={paso === 'confirmar'}
        gymId={gymId}
        gymNombre={gymNombre}
        vendedor={vendedor}
        totales={carrito}
        formaDePago={formaDePago()}
        aviso={avisoTerminos}
        confirmarTexto={metodo === 'paypal' ? 'Confirmar e ir a PayPal' : metodo === 'stripe' ? 'Confirmar e ir a Stripe' : undefined}
        onCancelar={() => setPaso(null)}
        onConfirmar={pagar}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  seccion: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  partida: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md },
  partidaTexto: { fontSize: 13.5, flexShrink: 1 },
  metodo: { borderWidth: 1.5, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  metodoCabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  metodoTitulo: { fontFamily: FontFamily.semiBold, fontSize: 14.5 },
  meta: { fontSize: 12, lineHeight: 16 },
  nota: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  enlace: { fontFamily: FontFamily.semiBold, textDecorationLine: 'underline' },
});
