import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatTile } from '@/components/ui/StatTile';
import { StateCard } from '@/components/ui/StateCard';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { fetchWorkoutStats, type Account, type WorkoutStats } from '@/lib/api';

export default function HomeScreen() {
  const { colors, brand } = useTheme();
  const { account, loading, error, reload } = useAccount();
  useAccountRefreshOnFocus();

  if (loading && !account) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.introRow}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Hola, {account.nombre.split(' ')[0]}
          </Text>
          <MembershipBadge account={account} />
        </View>

        <PagoAviso account={account} />
        <GymSection account={account} />

        {/* Siempre visible: no depende del gimnasio */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TU ENTRENAMIENTO</Text>
        <Reveal index={2}>
          <Card padded={false}>
            <ActionRow
              icon="barbell-outline"
              label="Entrenar ahora"
              hint="Registra series, repeticiones y peso"
              onPress={() => router.push('/(tabs)/workout')}
              bordered
            />
            <ActionRow
              icon="list-outline"
              label="Ver rutinas"
              hint={
                account.hasGymAccess
                  ? 'Las de tu gimnasio y las tuyas'
                  : 'Rutinas listas para hacer donde sea'
              }
              onPress={() => router.push('/(tabs)/routines')}
              bordered
            />
            <ActionRow
              icon="stats-chart-outline"
              label="Tu progreso"
              hint="Tu historial es tuyo, con gimnasio o sin él"
              onPress={() => router.push('/(tabs)/progress')}
            />
          </Card>
        </Reveal>

        <StatsReales userId={account.id} />
      </ScrollView>
    </SafeAreaView>
  );
}

// "2026-09-20" → "20 de septiembre". Se construye a mano porque `new Date` con
// una fecha suelta la interpreta en UTC y puede mostrar el día anterior.
function formatearFecha(iso: string | null): string {
  if (!iso) return '';
  const [, mes, dia] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dia} de ${meses[mes - 1]}`;
}

// Aviso de mensualidad. Solo aparece cuando falta poco o ya venció: el resto
// del tiempo no estorba, porque no hay nada que hacer al respecto.
function PagoAviso({ account }: { account: Account }) {
  const { colors, brand } = useTheme();
  const dias = account.diasParaVencer;
  if (dias == null || !account.gym || account.membershipStatus === 'none') return null;
  if (dias > 5) return null;

  const vencida = dias < 0;
  const color = vencida ? brand.danger : brand.warning;
  const titulo = vencida
    ? `Tu mensualidad venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
    : dias === 0
      ? 'Tu mensualidad vence hoy'
      : `Tienes ${dias} ${dias === 1 ? 'día' : 'días'} para pagar`;

  return (
    <Reveal index={0}>
      <Card style={[styles.avisoPago, { borderColor: color, borderWidth: 1.5 }]}>
        <View style={styles.avisoRow}>
          <Ionicons name={vencida ? 'alert-circle' : 'time'} size={22} color={color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.avisoTitulo, { color: colors.text }]}>{titulo}</Text>
            <Text style={[styles.avisoTexto, { color: colors.textSecondary }]}>
              {vencida
                ? `Ponte al corriente en ${account.gym.nombre} para recuperar tu acceso.`
                : `Paga en ${account.gym.nombre} antes del ${formatearFecha(account.fechaProximoPago)} para no perder el acceso.`}
            </Text>
          </View>
        </View>
      </Card>
    </Reveal>
  );
}

// El bloque del gimnasio cambia por completo según el estado de la membresía.
function GymSection({ account }: { account: Account }) {
  const { colors } = useTheme();

  if (account.membershipStatus === 'pending') {
    return (
      <StateCard
        index={0}
        icon="hourglass-outline"
        tone="warning"
        title="Solicitud enviada"
        message={`Le pediste acceso a ${account.gym?.nombre ?? 'tu gimnasio'}. En cuanto la aprueben verás aquí sus rutinas, su equipo y sus horarios.`}
      />
    );
  }

  if (account.membershipStatus === 'inactive') {
    return (
      <StateCard
        index={0}
        icon="lock-closed"
        tone="danger"
        title="Tu acceso está pausado"
        message={`${account.gym?.nombre ?? 'Tu gimnasio'} dio de baja tu membresía, así que su contenido ya no está disponible. Si crees que es un error, habla directamente con ellos.`}
        actionLabel="Vincular otro gimnasio"
        actionIcon="key-outline"
        actionVariant="outline"
        onAction={() => router.push('/gym-join')}
      />
    );
  }

  if (!account.gym) {
    return (
      <View style={{ gap: Spacing.md }}>
        <StateCard
          index={0}
          icon="business-outline"
          tone="brand"
          title="Todavía no tienes gimnasio"
          message="La app funciona completa sin gimnasio. Si vas a uno, vincúlalo con el código que te dan en recepción para ver sus rutinas y su equipo."
          actionLabel="Tengo un código"
          actionIcon="key-outline"
          onAction={() => router.push('/gym-join')}
        />
        <Reveal index={2}>
          <Card padded={false}>
            <ActionRow
              icon="compass-outline"
              label="Explorar gimnasios"
              hint="Mira qué gimnasios usan GymTrack cerca de ti"
              onPress={() => router.push('/gym-directory')}
            />
          </Card>
        </Reveal>
      </View>
    );
  }

  // Membresía activa: datos reales del gimnasio, traídos de la base de datos.
  const { gym } = account;
  return (
    <Reveal index={0}>
      <Card>
        <View style={styles.cardHeaderRow}>
          {gym.logo ? (
            <View style={[styles.logoFrame, { borderColor: colors.border }]}>
              <Image source={{ uri: gym.logo }} style={styles.logo} resizeMode="contain" />
            </View>
          ) : (
            <IconCircle name="business" tone="success" size={42} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{gym.nombre}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {account.role === 'owner' ? 'Tu gimnasio' : 'Membresía activa'}
            </Text>
          </View>
          <Badge label="Activa" tone="success" />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={{ gap: Spacing.sm }}>
          {gym.direccion ? <GymRow icon="location-outline" text={gym.direccion} /> : null}
          {gym.telefono ? <GymRow icon="call-outline" text={gym.telefono} /> : null}
          {gym.horario ? <GymRow icon="time-outline" text={gym.horario} /> : null}
          {gym.equipamiento ? <GymRow icon="barbell-outline" text={gym.equipamiento} /> : null}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <AnimatedPressable
          onPress={() => router.push('/gym-machines')}
          scaleTo={0.98}
          haptic={false}
          style={styles.equipoRow}>
          <IconCircle name="fitness-outline" tone="brand" size={36} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.equipoLabel, { color: colors.text }]}>Ver el equipo</Text>
            <Text style={[styles.equipoHint, { color: colors.textSecondary }]}>
              Máquinas y qué ejercicios puedes hacer en cada una
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </Card>
    </Reveal>
  );
}

function MembershipBadge({ account }: { account: Account }) {
  if (account.membershipStatus === 'pending') return <Badge label="En revisión" tone="warning" icon="hourglass-outline" />;
  if (account.membershipStatus === 'inactive') return <Badge label="Sin acceso" tone="danger" icon="lock-closed-outline" />;
  if (account.hasGymAccess) return <Badge label="Miembro activo" tone="success" icon="checkmark-circle-outline" />;
  return <Badge label="Modo libre" tone="brand" icon="walk-outline" />;
}

// Cifras calculadas de entrenamientos reales del usuario. Antes eran de ejemplo.
function StatsReales({ userId }: { userId: string }) {
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

  if (stats.totalSesiones === 0) {
    return (
      <Reveal index={6}>
        <Card style={styles.sinDatos}>
          <Text style={[styles.sinDatosTitulo, { color: colors.text }]}>Aún no registras entrenamientos</Text>
          <Text style={[styles.sinDatosTexto, { color: colors.textSecondary }]}>
            Registra el primero y aquí verás tu racha, tus sesiones y los kilos que mueves.
          </Text>
        </Card>
      </Reveal>
    );
  }

  return (
    <View style={styles.statsRow}>
      <Reveal index={3} style={{ flex: 1 }}>
        <StatTile icon="flame-outline" value={String(stats.rachaDias)} label="Días de racha" tone="warning" />
      </Reveal>
      <Reveal index={4} style={{ flex: 1 }}>
        <StatTile icon="calendar-outline" value={String(stats.sesionesEsteMes)} label="Sesiones este mes" tone="brand" />
      </Reveal>
      <Reveal index={5} style={{ flex: 1 }}>
        <StatTile
          icon="trending-up-outline"
          value={`${stats.volumenSemana.toLocaleString('es-MX')} kg`}
          label="Movidos esta semana"
          tone="info"
        />
      </Reveal>
    </View>
  );
}

function GymRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.gymRow}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={[styles.gymRowText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onPress,
  bordered,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  bordered?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      haptic={false}
      style={[styles.actionRow, bordered && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <IconCircle name={icon} tone="brand" size={38} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.actionHint, { color: colors.textSecondary }]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  introRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  heading: { flex: 1, fontFamily: FontFamily.bold, fontSize: 24 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 16 },
  cardMeta: { fontSize: 12.5, marginTop: 2 },
  divider: { height: 1, marginVertical: Spacing.lg },
  equipoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  equipoLabel: { fontFamily: FontFamily.medium, fontSize: 14 },
  equipoHint: { fontSize: 12, marginTop: 1 },
  gymRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  gymRowText: { flex: 1, fontSize: 13, fontFamily: FontFamily.regular },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  logoFrame: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 4,
    backgroundColor: '#FFFFFF',
  },
  logo: { width: '100%', height: '100%' },
  avisoPago: { paddingVertical: Spacing.lg },
  avisoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  avisoTitulo: { fontFamily: FontFamily.semiBold, fontSize: 14.5 },
  avisoTexto: { fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  sinDatos: { gap: Spacing.xs, paddingVertical: Spacing.lg },
  sinDatosTitulo: { fontFamily: FontFamily.semiBold, fontSize: 14.5 },
  sinDatosTexto: { fontSize: 12.5, lineHeight: 17 },
  sectionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, marginTop: Spacing.sm },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  actionLabel: { fontFamily: FontFamily.medium, fontSize: 14.5 },
  actionHint: { fontSize: 12, marginTop: 1 },
});
