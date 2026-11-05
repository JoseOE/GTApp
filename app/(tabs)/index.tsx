import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { puedeComprar } from '@/lib/CarritoContext';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatTile } from '@/components/ui/StatTile';
import { StateCard } from '@/components/ui/StateCard';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { PortadaGym } from '@/components/inicio/PortadaGym';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { fetchMyRoutines, fetchWorkoutStats, type Account, type Routine, type WorkoutStats } from '@/lib/api';
import { fetchPedidos, type Pedido } from '@/lib/tienda';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Inicio: la portada del gimnasio y, debajo, solo lo que sirve hoy:
// los avisos que piden hacer algo, el entrenamiento del día, la semana en
// cifras y el acceso a Mi gimnasio (donde vive la ficha completa).
export default function HomeScreen() {
  const { colors, brand, scheme } = useTheme();
  const { account, loading, error, reload } = useAccount();
  useAccountRefreshOnFocus();

  // La portada es una foto: mientras se ve Inicio, la hora y la batería van en blanco.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle(scheme === 'dark' ? 'light' : 'dark');
    }, [scheme])
  );

  if (loading && !account) {
    return (
      <SafeAreaView style={[styles.safe, styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <ScrollView contentContainerStyle={styles.contenido}>
          <StateCard
            icon="cloud-offline-outline"
            tone="danger"
            title="No pudimos conectar"
            message={error ?? 'Revisa tu conexión e inténtalo de nuevo.'}
            actionLabel="Reintentar"
            actionIcon="refresh-outline"
            onAction={reload}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const hoy = new Date();
  const fecha = `${DIAS[hoy.getDay()].toLowerCase()} ${hoy.getDate()} de ${MESES[hoy.getMonth()]}`;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} showsVerticalScrollIndicator={false}>
      <PortadaGym account={account} />

      {/* El contenido sube un poco sobre la portada, como una hoja. */}
      <View style={[styles.hoja, { backgroundColor: colors.background }]}>
        <View style={styles.contenido}>
          <View>
            <Text style={[Type.title, { color: colors.text }]}>Hola, {account.nombre.split(' ')[0]}</Text>
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>{fecha}</Text>
          </View>

          <Avisos account={account} />

          <EntrenarHoy account={account} />

          <Semana userId={account.id} />

          {account.gym ? (
            <Reveal index={4}>
              <Card padded={false}>
                <ListRow
                  icon="business-outline"
                  label="Mi gimnasio"
                  hint="Horario, ubicación, contacto y equipo"
                  onPress={() => router.push('/mi-gimnasio')}
                />
              </Card>
            </Reveal>
          ) : (
            <Reveal index={4}>
              <Card padded={false}>
                <ListRow
                  icon="key-outline"
                  label="Tengo un código"
                  hint="Vincula el gimnasio al que vas"
                  onPress={() => router.push('/gym-join')}
                  bordered
                />
                <ListRow
                  icon="compass-outline"
                  label="Explorar gimnasios"
                  hint="Mira cuáles usan GymTrack"
                  onPress={() => router.push('/gym-directory')}
                />
              </Card>
            </Reveal>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// "2026-09-20" → "20 de septiembre" (a mano: new Date con una fecha suelta la toma en UTC).
function formatearFecha(iso: string | null): string {
  if (!iso) return '';
  const [, mes, dia] = iso.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

// Solo aparecen cuando hay algo que hacer: la mensualidad por vencer o
// vencida, un pedido listo para recoger, o el estado de la solicitud.
function Avisos({ account }: { account: Account }) {
  const { brand } = useTheme();
  const [porRecoger, setPorRecoger] = useState<Pedido | null>(null);
  const comprador = puedeComprar(account);

  useFocusEffect(
    useCallback(() => {
      if (!comprador) {
        setPorRecoger(null);
        return;
      }
      let cancelado = false;
      fetchPedidos()
        .then((ps) => {
          if (!cancelado) setPorRecoger(ps.find((p) => p.entrega?.estado === 'pendiente') ?? null);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [comprador])
  );

  const avisos: ReactNode[] = [];

  if (account.membershipStatus === 'pending') {
    avisos.push(
      <Aviso
        key="pendiente"
        icon="hourglass-outline"
        color={brand.warning}
        titulo="Solicitud enviada"
        texto={`${account.gym?.nombre ?? 'Tu gimnasio'} todavía no la aprueba. En cuanto lo haga verás sus rutinas y su equipo.`}
      />
    );
  } else if (account.membershipStatus === 'inactive') {
    avisos.push(
      <Aviso
        key="pausada"
        icon="lock-closed-outline"
        color={brand.danger}
        titulo="Tu acceso está pausado"
        texto={`${account.gym?.nombre ?? 'Tu gimnasio'} dio de baja tu membresía. Si crees que es un error, habla con ellos.`}
      />
    );
  }

  const dias = account.diasParaVencer;
  if (dias != null && account.gym && account.hasGymAccess && dias <= 5) {
    const vencida = dias < 0;
    avisos.push(
      <Aviso
        key="pago"
        icon={vencida ? 'alert-circle-outline' : 'time-outline'}
        color={vencida ? brand.danger : brand.warning}
        titulo={
          vencida
            ? `Tu mensualidad venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
            : dias === 0
              ? 'Tu mensualidad vence hoy'
              : `Tu mensualidad vence en ${dias} ${dias === 1 ? 'día' : 'días'}`
        }
        texto={
          vencida
            ? `Ponte al corriente en ${account.gym.nombre} para recuperar tu acceso.`
            : `Paga antes del ${formatearFecha(account.fechaProximoPago)} para no perder el acceso.`
        }
      />
    );
  }

  if (porRecoger) {
    avisos.push(
      <Aviso
        key="pedido"
        icon="qr-code-outline"
        color={brand.success}
        titulo={`Tu pedido #${porRecoger.folio} está listo`}
        texto="Recógelo en recepción mostrando su QR."
        onPress={() => router.push({ pathname: '/pedido/[orderId]', params: { orderId: porRecoger.orderId } })}
      />
    );
  }

  if (avisos.length === 0) return null;
  return (
    <Reveal index={1} style={{ gap: Spacing.sm }}>
      {avisos}
    </Reveal>
  );
}

function Aviso({
  icon,
  color,
  titulo,
  texto,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  titulo: string;
  texto: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const contenido = (
    <View style={[styles.aviso, { backgroundColor: color + '14', borderColor: color + '55' }]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <Text style={[Type.headline, { color: colors.text }]}>{titulo}</Text>
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>{texto}</Text>
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} /> : null}
    </View>
  );
  if (!onPress) return contenido;
  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.98} accessibilityRole="button">
      {contenido}
    </AnimatedPressable>
  );
}

// La acción principal del día: la rutina que el gimnasio puso para hoy (si
// hay) o un entrenamiento libre, con un solo botón para empezar.
function EntrenarHoy({ account }: { account: Account }) {
  const { brand } = useTheme();
  const [rutina, setRutina] = useState<Routine | null>(null);
  const diaHoy = DIAS[new Date().getDay()];

  useFocusEffect(
    useCallback(() => {
      if (!account.hasGymAccess) {
        setRutina(null);
        return;
      }
      let cancelado = false;
      fetchMyRoutines(account.id)
        .then((rs) => {
          if (!cancelado) setRutina(rs.find((r) => r.dia === diaHoy) ?? null);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [account.id, account.hasGymAccess, diaHoy])
  );

  return (
    <Reveal index={2}>
      <View style={[styles.hoy, { borderColor: brand.primary + '40' }]}>
        <Text style={[Type.overline, { color: brand.primary }]}>HOY · {diaHoy.toUpperCase()}</Text>
        <Text style={[Type.title, styles.hoyTitulo]} numberOfLines={2}>
          {rutina ? rutina.nombre : 'Entrenamiento libre'}
        </Text>
        <Text style={[Type.footnote, styles.hoyMeta]}>
          {rutina
            ? [`${rutina.ejercicios.length} ejercicios`, rutina.duracion, rutina.coach ? `con ${rutina.coach}` : null]
                .filter(Boolean)
                .join(' · ')
            : 'Anota tus series, repeticiones y peso.'}
        </Text>
        <View style={{ marginTop: Spacing.md }}>
          <PrimaryButton label="Empezar entrenamiento" icon="play" onPress={() => router.push('/workout-log')} />
        </View>
        <AnimatedPressable onPress={() => router.push('/(tabs)/routines')} style={styles.hoyEnlace} hitSlop={8}>
          <Text style={[Type.callout, styles.hoyEnlaceTexto]}>
            {rutina ? 'Ver la rutina completa' : 'Elegir una rutina'}
          </Text>
          <Ionicons name="chevron-forward" size={15} color="rgba(255,255,255,0.75)" />
        </AnimatedPressable>
      </View>
    </Reveal>
  );
}

// La semana en cifras, grandes.
function Semana({ userId }: { userId: string }) {
  const { colors } = useTheme();
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelado = false;
      fetchWorkoutStats(userId)
        .then((data) => {
          if (!cancelado) setStats(data);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [userId])
  );

  if (!stats) return null;

  return (
    <Reveal index={3} style={{ gap: Spacing.sm }}>
      <Text style={[Type.overline, { color: colors.textSecondary }]}>TU PROGRESO</Text>
      {stats.totalSesiones === 0 ? (
        <Text style={[Type.footnote, { color: colors.textSecondary }]}>
          Registra tu primer entrenamiento y aquí verás tu racha, tus sesiones y los kilos que mueves.
        </Text>
      ) : (
        <View style={styles.cifras}>
          <StatTile icon="flame" value={String(stats.rachaDias)} unidad={stats.rachaDias === 1 ? 'día' : 'días'} label="de racha" tone="warning" />
          <StatTile icon="calendar" value={String(stats.sesionesEsteMes)} label="sesiones este mes" tone="brand" />
          <StatTile
            icon="barbell"
            value={stats.volumenSemana >= 1000 ? (stats.volumenSemana / 1000).toFixed(1) : String(stats.volumenSemana)}
            unidad={stats.volumenSemana >= 1000 ? 't' : 'kg'}
            label="movidos esta semana"
            tone="info"
          />
        </View>
      )}
    </Reveal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  hoja: { marginTop: -Radius.xl, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
  contenido: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg },
  // La tarjeta del día va oscura siempre: es la parte "deportiva" de Inicio.
  hoy: { backgroundColor: '#141417', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, gap: 2 },
  hoyTitulo: { color: '#FFFFFF', marginTop: Spacing.xs },
  hoyMeta: { color: 'rgba(255,255,255,0.65)' },
  hoyEnlace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: Spacing.md },
  hoyEnlaceTexto: { color: 'rgba(255,255,255,0.75)' },
  cifras: { flexDirection: 'row', gap: Spacing.sm },
});
