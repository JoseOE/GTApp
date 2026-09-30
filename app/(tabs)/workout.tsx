import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Spacing } from '@/constants/Theme';
import { deleteWorkout, fetchWorkouts, type WorkoutSession } from '@/lib/api';

// Entrenar nunca se bloquea: es lo que hace útil la app sin gimnasio.
export default function WorkoutScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [workouts, setWorkouts] = useState<WorkoutSession[] | null>(null);

  const userId = account?.id;

  const cargar = useCallback(() => {
    if (!userId) return;
    fetchWorkouts(userId)
      .then(setWorkouts)
      .catch(() => setWorkouts([]));
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function borrar(id: string) {
    if (!userId) return;
    setWorkouts((prev) => (prev ?? []).filter((w) => w.id !== id));
    try {
      await deleteWorkout(userId, id);
    } catch {
      cargar();
    }
  }

  if (!account || !workouts) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Entrenar</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          Anota tus series y tu peso. Tu historial es tuyo, estés en un gimnasio o no.
        </Text>

        <Reveal index={0}>
          <PrimaryButton
            label="Registrar entrenamiento"
            icon="add-circle-outline"
            onPress={() => router.push('/workout-log')}
          />
        </Reveal>

        {workouts.length === 0 ? (
          <Reveal index={1}>
            <Card style={styles.vacio}>
              <IconCircle name="barbell-outline" tone="muted" size={56} />
              <Text style={[styles.vacioTitulo, { color: colors.text }]}>Todavía no hay entrenamientos</Text>
              <Text style={[styles.vacioTexto, { color: colors.textSecondary }]}>
                Cuando registres el primero aparecerá aquí, con sus series, su peso y el volumen total.
              </Text>
            </Card>
          </Reveal>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TU HISTORIAL · {workouts.length}
            </Text>
            {workouts.map((w, i) => (
              <WorkoutCard key={w.id} workout={w} index={i} onDelete={() => borrar(w.id)} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutCard({
  workout,
  index,
  onDelete,
}: {
  workout: WorkoutSession;
  index: number;
  onDelete: () => void;
}) {
  const { colors, brand } = useTheme();
  const [abierto, setAbierto] = useState(false);

  const totalSeries = workout.ejercicios.reduce((n, e) => n + e.series.length, 0);
  const volumen = workout.ejercicios.reduce(
    (total, e) =>
      total +
      e.series.reduce((sub, s) => sub + (s.completada && s.peso && s.repeticiones ? s.peso * s.repeticiones : 0), 0),
    0
  );

  return (
    <Reveal index={index}>
      <Card style={styles.card}>
        <AnimatedPressable onPress={() => setAbierto((v) => !v)} scaleTo={0.99} haptic={false}>
          <View style={styles.cardTop}>
            <IconCircle name="barbell" tone="brand" size={42} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: colors.text }]}>{workout.nombre}</Text>
              <Text style={[styles.fecha, { color: colors.textSecondary }]}>{formatearFecha(workout.fecha)}</Text>
            </View>
            <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
          </View>
        </AnimatedPressable>

        <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
          <Badge label={`${workout.ejercicios.length} ejercicios`} tone="muted" />
          <Badge label={`${totalSeries} series`} tone="muted" />
          {volumen > 0 ? <Badge label={`${Math.round(volumen).toLocaleString('es-MX')} kg`} tone="info" /> : null}
          {workout.duracionMinutos ? <Badge label={`${workout.duracionMinutos} min`} tone="muted" /> : null}
        </View>

        {abierto ? (
          <View style={[styles.detalle, { borderTopColor: colors.border }]}>
            {workout.ejercicios.map((e, i) => (
              <View key={i} style={styles.detalleEjercicio}>
                <Text style={[styles.detalleNombre, { color: colors.text }]}>{e.nombre}</Text>
                {e.machineNombre ? (
                  <Text style={[styles.detalleMaquina, { color: colors.textSecondary }]}>{e.machineNombre}</Text>
                ) : null}
                <View style={styles.seriesWrap}>
                  {e.series.map((s, j) => (
                    <View
                      key={j}
                      style={[styles.serieChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.serieTexto, { color: colors.text }]}>
                        {s.repeticiones ?? '-'}
                        {s.peso ? ` × ${s.peso}kg` : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <AnimatedPressable onPress={onDelete} scaleTo={0.97} style={styles.borrar}>
              <Ionicons name="trash-outline" size={15} color={brand.danger} />
              <Text style={[styles.borrarTexto, { color: brand.danger }]}>Eliminar entrenamiento</Text>
            </AnimatedPressable>
          </View>
        ) : null}
      </Card>
    </Reveal>
  );
}

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  heading: { fontFamily: FontFamily.bold, fontSize: 22 },
  subtext: { fontSize: 13.5, lineHeight: 19, marginTop: -Spacing.sm },
  sectionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, marginTop: Spacing.sm },
  card: { gap: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 15.5 },
  fecha: { fontSize: 12.5, marginTop: 2, textTransform: 'capitalize' },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
  },
  detalle: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.md, gap: Spacing.md },
  detalleEjercicio: { gap: 4 },
  detalleNombre: { fontFamily: FontFamily.medium, fontSize: 14 },
  detalleMaquina: { fontSize: 11.5 },
  seriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: 2 },
  serieChip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  serieTexto: { fontSize: 12, fontFamily: FontFamily.medium },
  borrar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm },
  borrarTexto: { fontSize: 12.5, fontFamily: FontFamily.medium },
  vacio: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  vacioTitulo: { fontFamily: FontFamily.bold, fontSize: 16, textAlign: 'center', marginTop: Spacing.sm },
  vacioTexto: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
});
