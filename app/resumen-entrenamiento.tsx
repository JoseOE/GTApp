import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { ZoomIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useEntrenamiento } from '@/lib/EntrenamientoContext';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Reveal } from '@/components/ui/Reveal';
import { StatTile } from '@/components/ui/StatTile';
import { StateCard } from '@/components/ui/StateCard';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { formatoPeso, reloj } from '@/lib/entrenamiento';

// Al terminar: tiempo, volumen, series y reps, los récords que rompiste, los
// músculos que trabajaste y el detalle de cada ejercicio.
export default function ResumenEntrenamientoScreen() {
  const { colors, brand } = useTheme();
  const { resumen } = useEntrenamiento();
  const reducir = useReducedMotion();

  const listo = () => router.replace('/(tabs)/workout');

  if (!resumen) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={{ padding: Spacing.xl }}>
          <StateCard
            icon="barbell-outline"
            tone="muted"
            title="Resumen no disponible"
            message="Tu entrenamiento ya está en tu historial."
            actionLabel="Ver historial"
            onAction={listo}
          />
        </View>
      </SafeAreaView>
    );
  }

  const maxSeries = Math.max(1, ...resumen.musculos.map((m) => m.series));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Resumen', headerBackVisible: false, gestureEnabled: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabeza}>
          <Animated.View
            entering={reducir ? undefined : ZoomIn.springify().damping(14)}
            style={[styles.trofeo, { backgroundColor: brand.success }]}>
            <Ionicons name={resumen.records.length ? 'trophy' : 'checkmark'} size={36} color="#FFFFFF" />
          </Animated.View>
          <Text style={[Type.title, { color: colors.text, textAlign: 'center' }]}>¡Entrenamiento terminado!</Text>
          <Text style={[Type.callout, { color: colors.textSecondary, textAlign: 'center' }]}>{resumen.nombre}</Text>
        </View>

        <Reveal index={0} style={styles.grid}>
          <View style={styles.celda}>
            <StatTile icon="time-outline" value={reloj(resumen.segundos)} label="Tiempo" tone="brand" />
          </View>
          <View style={styles.celda}>
            <StatTile
              icon="barbell-outline"
              value={Math.round(resumen.volumen).toLocaleString('es-MX')}
              unidad="kg"
              label="Volumen"
              tone="info"
            />
          </View>
          <View style={styles.celda}>
            <StatTile icon="layers-outline" value={String(resumen.series)} label="Series" tone="success" />
          </View>
          <View style={styles.celda}>
            <StatTile icon="repeat-outline" value={String(resumen.repeticiones)} label="Repeticiones" tone="warning" />
          </View>
        </Reveal>

        {resumen.records.length ? (
          <Reveal index={1}>
            <Card style={{ gap: Spacing.md }}>
              <Text style={[Type.overline, { color: brand.warning }]}>RÉCORDS PERSONALES · {resumen.records.length}</Text>
              {resumen.records.map((r, i) => (
                <View key={i} style={styles.record}>
                  <Ionicons name="trophy" size={18} color={brand.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.callout, { color: colors.text }]}>{r.ejercicio}</Text>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>{r.texto}</Text>
                  </View>
                </View>
              ))}
            </Card>
          </Reveal>
        ) : null}

        {resumen.musculos.length ? (
          <Reveal index={2}>
            <Card style={{ gap: Spacing.md }}>
              <Text style={[Type.overline, { color: colors.textSecondary }]}>MÚSCULOS TRABAJADOS</Text>
              {resumen.musculos.map((m) => (
                <View key={m.musculo} style={{ gap: 4 }}>
                  <View style={styles.musculoFila}>
                    <Text style={[Type.callout, { color: colors.text }]}>{m.musculo}</Text>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>
                      {m.series} {m.series === 1 ? 'serie' : 'series'}
                    </Text>
                  </View>
                  <View style={[styles.barraFondo, { backgroundColor: colors.border }]}>
                    <View style={[styles.barra, { backgroundColor: brand.primary, width: `${(m.series / maxSeries) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </Card>
          </Reveal>
        ) : null}

        <Reveal index={3}>
          <Card style={{ gap: Spacing.md }}>
            <Text style={[Type.overline, { color: colors.textSecondary }]}>EJERCICIOS · {resumen.ejercicios}</Text>
            {resumen.detalle.map((d, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Text style={[Type.callout, { color: colors.text }]}>{d.nombre}</Text>
                <View style={styles.series}>
                  {d.series.map((s, j) => (
                    <View key={j} style={[styles.serie, { borderColor: colors.border, backgroundColor: colors.background }]}>
                      <Text style={[Type.caption, { color: colors.text }]}>
                        {s.peso ? `${formatoPeso(s.peso)} kg × ` : ''}
                        {s.repeticiones ?? '–'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Card>
        </Reveal>

        <PrimaryButton label="Listo" icon="checkmark-circle-outline" onPress={listo} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  cabeza: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md },
  trofeo: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  celda: { width: '47%', flexGrow: 1 },
  record: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  musculoFila: { flexDirection: 'row', justifyContent: 'space-between' },
  barraFondo: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barra: { height: 6, borderRadius: 3 },
  series: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  serie: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 4 },
});
