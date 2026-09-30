import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StatTile } from '@/components/ui/StatTile';
import { Reveal } from '@/components/ui/Reveal';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { fetchWorkoutStats, type WorkoutStats } from '@/lib/api';

// Todo lo de esta pantalla sale de entrenamientos reales del usuario.
// Nunca se bloquea: el progreso es suyo, con gimnasio o sin él.
export default function ProgressScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [stats, setStats] = useState<WorkoutStats | null>(null);

  const userId = account?.id;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
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

  if (!stats) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (stats.totalSesiones === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.heading, { color: colors.text }]}>Progreso</Text>
          <Reveal index={0}>
            <Card style={styles.vacio}>
              <IconCircle name="stats-chart-outline" tone="muted" size={56} />
              <Text style={[styles.vacioTitulo, { color: colors.text }]}>Tu progreso empieza con el primer registro</Text>
              <Text style={[styles.vacioTexto, { color: colors.textSecondary }]}>
                En cuanto anotes un entrenamiento verás aquí tu racha, tu volumen por grupo muscular y cuánto avanzas semana a semana.
              </Text>
              <View style={{ alignSelf: 'stretch', marginTop: Spacing.md }}>
                <PrimaryButton
                  label="Registrar entrenamiento"
                  icon="add-circle-outline"
                  onPress={() => router.push('/workout-log')}
                />
              </View>
            </Card>
          </Reveal>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const musculos = Object.entries(stats.volumenPorMusculo)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const maximo = musculos.length ? musculos[0][1] : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.heading, { color: colors.text }]}>Progreso</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          Calculado con tus {stats.totalSesiones} {stats.totalSesiones === 1 ? 'entrenamiento' : 'entrenamientos'} registrados.
        </Text>

        <View style={styles.statsRow}>
          <Reveal index={0} style={{ flex: 1 }}>
            <StatTile icon="flame-outline" value={String(stats.rachaDias)} label="Días de racha" tone="warning" />
          </Reveal>
          <Reveal index={1} style={{ flex: 1 }}>
            <StatTile icon="calendar-outline" value={String(stats.sesionesEsteMes)} label="Este mes" tone="brand" />
          </Reveal>
          <Reveal index={2} style={{ flex: 1 }}>
            <StatTile icon="layers-outline" value={String(stats.seriesTotales)} label="Series totales" tone="info" />
          </Reveal>
        </View>

        <Reveal index={3}>
          <Card>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Volumen de esta semana</Text>
            <Text style={[styles.volumenGrande, { color: colors.tint }]}>
              {stats.volumenSemana.toLocaleString('es-MX')} kg
            </Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              Suma de peso × repeticiones de las series que marcaste como completadas.
            </Text>
          </Card>
        </Reveal>

        {musculos.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>VOLUMEN POR GRUPO MUSCULAR</Text>
            <Reveal index={4}>
              <Card style={{ gap: Spacing.md }}>
                {musculos.map(([musculo, volumen]) => (
                  <View key={musculo} style={styles.barraFila}>
                    <View style={styles.barraEncabezado}>
                      <Text style={[styles.barraEtiqueta, { color: colors.text }]}>{musculo}</Text>
                      <Text style={[styles.barraValor, { color: colors.textSecondary }]}>
                        {Math.round(volumen).toLocaleString('es-MX')} kg
                      </Text>
                    </View>
                    <View style={[styles.barraFondo, { backgroundColor: colors.background }]}>
                      <View
                        style={[
                          styles.barraRelleno,
                          { backgroundColor: colors.tint, width: `${maximo ? (volumen / maximo) * 100 : 0}%` },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </Card>
            </Reveal>
          </>
        ) : null}

        {stats.ultimoEntrenamiento ? (
          <Text style={[styles.pie, { color: colors.textSecondary }]}>
            Último entrenamiento: {new Date(stats.ultimoEntrenamiento).toLocaleDateString('es-MX', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  heading: { fontFamily: FontFamily.bold, fontSize: 22 },
  subtext: { fontSize: 13.5, lineHeight: 19, marginTop: -Spacing.sm },
  sectionLabel: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, marginTop: Spacing.sm },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  cardTitle: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  cardMeta: { fontSize: 12.5, lineHeight: 17, marginTop: Spacing.xs },
  volumenGrande: { fontFamily: FontFamily.extraBold, fontSize: 34, marginTop: Spacing.xs },
  barraFila: { gap: 6 },
  barraEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  barraEtiqueta: { fontFamily: FontFamily.medium, fontSize: 13.5 },
  barraValor: { fontSize: 12.5 },
  barraFondo: { height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  barraRelleno: { height: '100%', borderRadius: Radius.pill },
  pie: { fontSize: 12, textTransform: 'capitalize' },
  vacio: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  vacioTitulo: { fontFamily: FontFamily.bold, fontSize: 16, textAlign: 'center', marginTop: Spacing.sm },
  vacioTexto: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 290 },
});
