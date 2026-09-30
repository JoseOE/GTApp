import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { StateCard } from '@/components/ui/StateCard';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Spacing } from '@/constants/Theme';
import { fetchMyRoutines, type Routine } from '@/lib/api';
import { STARTER_ROUTINES, type StarterRoutine } from '@/constants/StarterRoutines';

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  espalda: 'body-outline',
  pecho: 'body-outline',
  pierna: 'walk-outline',
  hombro: 'barbell-outline',
  brazo: 'barbell-outline',
  core: 'ellipse-outline',
  cardio: 'heart-outline',
  movilidad: 'walk-outline',
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function iconForCategory(categoria: string) {
  return CATEGORY_ICON[categoria.trim().toLowerCase()] ?? 'fitness-outline';
}

export default function RoutinesScreen() {
  const { colors, brand } = useTheme();
  const { account, loading: accountLoading } = useAccount();
  useAccountRefreshOnFocus();
  const [gymRoutines, setGymRoutines] = useState<Routine[]>([]);
  const [loadingRoutines, setLoadingRoutines] = useState(false);

  const hasAccess = account?.hasGymAccess ?? false;
  const userId = account?.id;

  // Las rutinas del gimnasio solo se piden si el servidor ya confirmó el acceso.
  useEffect(() => {
    if (!userId || !hasAccess) {
      setGymRoutines([]);
      return;
    }
    let cancelled = false;
    setLoadingRoutines(true);
    fetchMyRoutines(userId)
      .then((data) => {
        if (!cancelled) setGymRoutines(data);
      })
      .catch(() => {
        if (!cancelled) setGymRoutines([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoutines(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, hasAccess]);

  const openWorkout = useCallback(() => router.push('/(tabs)/workout'), []);

  if (accountLoading && !account) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  const hoy = DIAS[new Date().getDay()];
  const rutinasDeHoy = gymRoutines.filter((r) => r.dia === hoy);
  const restoDelGimnasio = gymRoutines.filter((r) => r.dia !== hoy);
  const grupos = groupByCategoria(restoDelGimnasio);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Rutinas</Text>

        {/* Lo que puso el coach para hoy va primero: es lo que el usuario abre la app a buscar. */}
        {rutinasDeHoy.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: brand.primary }]}>
              HOY · {hoy.toUpperCase()}
            </Text>
            {rutinasDeHoy.map((r, i) => (
              <GymRoutineCard key={r.id} routine={r} index={i} onPress={openWorkout} destacada />
            ))}
          </>
        ) : null}

        {/* Estado del gimnasio, solo cuando hay algo que explicar */}
        {account && !hasAccess ? <GymNotice status={account.membershipStatus} gymNombre={account.gym?.nombre} /> : null}

        {hasAccess ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {account?.gym?.nombre?.toUpperCase() ?? 'TU GIMNASIO'}
            </Text>
            {loadingRoutines ? (
              <ActivityIndicator color={brand.primary} style={{ marginVertical: Spacing.xl }} />
            ) : gymRoutines.length === 0 ? (
              <Reveal index={0}>
                <Card style={styles.emptyCard}>
                  <IconCircle name="barbell-outline" tone="muted" size={48} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Tu gimnasio aún no publica rutinas
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Mientras tanto, abajo tienes las rutinas de GymTrack.
                  </Text>
                </Card>
              </Reveal>
            ) : (
              Object.keys(grupos)
                .sort()
                .map((cat, ci) => (
                  <View key={cat} style={{ gap: Spacing.md }}>
                    <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}>
                      {cat.toUpperCase()}
                    </Text>
                    {grupos[cat].map((r, i) => (
                      <GymRoutineCard key={r.id} routine={r} index={ci * 3 + i} onPress={openWorkout} />
                    ))}
                  </View>
                ))
            )}
          </>
        ) : null}

        {/* Catálogo propio de la app: existe siempre, con gimnasio o sin él */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          RUTINAS DE GYMTRACK · SIN EQUIPO
        </Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>
          Disponibles siempre, en casa o en cualquier gimnasio.
        </Text>
        {STARTER_ROUTINES.map((r, i) => (
          <StarterRoutineCard key={r.id} routine={r} index={i} onPress={openWorkout} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function GymNotice({ status, gymNombre }: { status: string; gymNombre?: string }) {
  if (status === 'pending') {
    return (
      <StateCard
        index={0}
        icon="hourglass-outline"
        tone="warning"
        title="Esperando aprobación"
        message={`Cuando ${gymNombre ?? 'tu gimnasio'} apruebe tu solicitud, sus rutinas aparecerán aquí.`}
      />
    );
  }
  if (status === 'inactive') {
    return (
      <StateCard
        index={0}
        icon="lock-closed"
        tone="danger"
        title="Rutinas del gimnasio bloqueadas"
        message={`${gymNombre ?? 'Tu gimnasio'} dio de baja tu membresía. Abajo siguen tus rutinas de GymTrack.`}
      />
    );
  }
  return (
    <StateCard
      index={0}
      icon="key-outline"
      tone="brand"
      title="¿Vas a un gimnasio?"
      message="Vincúlalo con su código de acceso y verás aquí las rutinas que publique su coach."
      actionLabel="Vincular gimnasio"
      actionIcon="key-outline"
      actionVariant="outline"
      onAction={() => router.push('/gym-join')}
    />
  );
}

function GymRoutineCard({
  routine,
  index,
  onPress,
  destacada,
}: {
  routine: Routine;
  index: number;
  onPress: () => void;
  destacada?: boolean;
}) {
  const { colors, brand } = useTheme();
  return (
    <Reveal index={index}>
      <Card style={[styles.card, destacada && { borderColor: brand.primary, borderWidth: 1.5 }]}>
        <View style={styles.cardTop}>
          <IconCircle name={iconForCategory(routine.categoria)} tone="brand" size={46} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.routineName, { color: colors.text }]}>{routine.nombre}</Text>
            {routine.descripcion ? (
              <Text style={[styles.routineGroup, { color: colors.textSecondary }]}>{routine.descripcion}</Text>
            ) : null}
          </View>
        </View>

        {routine.coach || routine.nivel ? (
          <View style={styles.badgeRow}>
            {routine.coach ? <Badge label={`Coach ${routine.coach}`} tone="info" icon="person-outline" /> : null}
            {routine.nivel ? <Badge label={routine.nivel} tone="muted" /> : null}
          </View>
        ) : null}

        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <MetaChip icon="fitness-outline" text={`${(routine.ejercicios ?? []).length} ejercicios`} />
          {routine.duracion ? <MetaChip icon="time-outline" text={routine.duracion} /> : null}
          <View style={{ flex: 1 }} />
          <AnimatedPressable onPress={onPress} hitSlop={10} scaleTo={0.85} style={styles.playButton}>
            <Ionicons name="play-circle" size={32} color={colors.tint} />
          </AnimatedPressable>
        </View>
      </Card>
    </Reveal>
  );
}

function StarterRoutineCard({
  routine,
  index,
  onPress,
}: {
  routine: StarterRoutine;
  index: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Reveal index={index}>
      <Card style={styles.card}>
        <View style={styles.cardTop}>
          <IconCircle name={iconForCategory(routine.categoria)} tone="info" size={46} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.routineName, { color: colors.text }]}>{routine.nombre}</Text>
            <Text style={[styles.routineGroup, { color: colors.textSecondary }]}>{routine.descripcion}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <Badge label={routine.categoria} tone="brand" />
          <Badge label={routine.nivel} tone="muted" />
          <Badge label={routine.equipo} tone="success" icon="checkmark-circle-outline" />
        </View>

        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <MetaChip icon="fitness-outline" text={`${routine.ejercicios.length} ejercicios`} />
          <MetaChip icon="time-outline" text={routine.duracion} />
          <View style={{ flex: 1 }} />
          <AnimatedPressable onPress={onPress} hitSlop={10} scaleTo={0.85} style={styles.playButton}>
            <Ionicons name="play-circle" size={32} color={colors.tint} />
          </AnimatedPressable>
        </View>
      </Card>
    </Reveal>
  );
}

function groupByCategoria(routines: Routine[]): Record<string, Routine[]> {
  const groups: Record<string, Routine[]> = {};
  routines.forEach((r) => {
    const key = r.categoria?.trim() || 'Sin categoría';
    (groups[key] ??= []).push(r);
  });
  return groups;
}

function MetaChip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={14} color={colors.textSecondary} />
      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  heading: { fontFamily: FontFamily.bold, fontSize: 22 },
  sectionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, marginTop: Spacing.sm },
  sectionHint: { fontSize: 12.5, lineHeight: 17, marginTop: -Spacing.md },
  categoryLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6 },
  card: { gap: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.md },
  routineName: { fontFamily: FontFamily.semiBold, fontSize: 15.5 },
  routineGroup: { fontSize: 12.5, marginTop: 2 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    borderTopWidth: 1,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  playButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -Spacing.sm },
  metaChipText: { fontSize: 12.5, fontFamily: FontFamily.medium },
  emptyCard: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  emptyTitle: { fontFamily: FontFamily.bold, fontSize: 15.5, textAlign: 'center', marginTop: Spacing.sm },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
});
