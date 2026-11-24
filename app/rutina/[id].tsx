import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { useEntrenamiento } from '@/lib/EntrenamientoContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Reveal } from '@/components/ui/Reveal';
import { StateCard } from '@/components/ui/StateCard';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { SelectorReemplazo } from '@/components/entrenamiento/SelectorReemplazo';
import { FotosEjercicio, MiniaturaEjercicio } from '@/components/entrenamiento/FotosEjercicio';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { STARTER_ROUTINES } from '@/constants/StarterRoutines';
import { fetchMyMachines, fetchMyRoutines, fetchWorkouts, type Machine } from '@/lib/api';
import { aplicarCambios, guardarCambios, leerCambios } from '@/lib/cambiosRutina';
import { alerta } from '@/lib/dialogo';
import {
  claveEjercicio,
  planDeRutina,
  planDeStarter,
  reemplazar,
  textoDescanso,
  textoSerie,
  ultimasSeries,
  type EjercicioPlan,
  type PlanRutina,
  type SerieAnterior,
} from '@/lib/entrenamiento';

type Info = { coach?: string; nivel?: string; duracion?: string; descripcion?: string };

// Antes de empezar: los ejercicios de la rutina, con la opción de cambiar los
// que no te gusten por otros del mismo músculo.
export default function RutinaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const { sesion, iniciar } = useEntrenamiento();
  const [base, setBase] = useState<PlanRutina | null>(null);
  const [plan, setPlan] = useState<PlanRutina | null>(null);
  const [info, setInfo] = useState<Info>({});
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [recordar, setRecordar] = useState(true);
  const [iniciando, setIniciando] = useState(false);
  const [anteriores, setAnteriores] = useState<Record<string, SerieAnterior[]>>({});
  const [abierto, setAbierto] = useState<string | null>(null);

  const userId = account?.id;
  const tieneGym = account?.hasGymAccess ?? false;

  useEffect(() => {
    if (!userId || !id) return;
    let cancelado = false;
    (async () => {
      try {
        const maquinas = tieneGym ? await fetchMyMachines(userId).catch(() => [] as Machine[]) : [];
        let nuevo: PlanRutina;
        let datos: Info;
        const starter = STARTER_ROUTINES.find((r) => r.id === id);
        if (starter) {
          nuevo = planDeStarter(starter);
          datos = { nivel: starter.nivel, duracion: starter.duracion, descripcion: starter.descripcion };
        } else {
          const rutina = (await fetchMyRoutines(userId)).find((r) => r.id === id);
          if (!rutina) throw new Error('Esta rutina ya no está disponible.');
          nuevo = planDeRutina(rutina, maquinas);
          datos = { coach: rutina.coach, nivel: rutina.nivel, duracion: rutina.duracion, descripcion: rutina.descripcion };
        }
        const cambios = await leerCambios(userId, id);
        const historial = await fetchWorkouts(userId).catch(() => []);
        if (cancelado) return;
        setAnteriores(ultimasSeries(historial));
        setMachines(maquinas);
        setInfo(datos);
        setBase(nuevo);
        setPlan({ ...nuevo, ejercicios: aplicarCambios(nuevo.ejercicios, cambios) });
      } catch (e) {
        if (!cancelado) setError(e instanceof Error ? e.message : 'No se pudo cargar la rutina.');
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [userId, id, tieneGym]);

  function cambiar(i: number, nuevo: EjercicioPlan) {
    setPlan((p) => (p ? { ...p, ejercicios: p.ejercicios.map((e, j) => (j === i ? nuevo : e)) } : p));
  }

  async function empezar() {
    if (!plan || !base || !userId) return;
    // Lo que se recuerda es tu versión; si no quieres, se olvida la anterior.
    await guardarCambios(userId, recordar ? plan : base);
    setIniciando(true);
    try {
      await iniciar(plan);
      router.replace('/entrenando');
    } finally {
      setIniciando(false);
    }
  }

  function alPresionarIniciar() {
    if (!sesion) {
      empezar();
      return;
    }
    alerta('Ya tienes un entrenamiento en curso', `Llevas "${sesion.nombre}" sin terminar.`, [
      { text: 'Continuar ese', onPress: () => router.replace('/entrenando') },
      { text: 'Descartarlo y empezar este', style: 'destructive', onPress: empezar },
      { text: 'Cancelar', style: 'cancel' },
    ], { icono: 'timer-outline', tono: 'marca' });
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.scroll}>
          <StateCard icon="alert-circle-outline" tone="danger" title="No se pudo abrir" message={error} />
        </View>
      </SafeAreaView>
    );
  }

  if (!plan || !base) {
    return (
      <SafeAreaView style={[styles.safe, styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  const cambiados = plan.ejercicios.filter((e) => e.reemplazaA).length;
  const totalSeries = plan.ejercicios.reduce((n, e) => n + e.series, 0);
  const seleccionado = cambiando != null ? plan.ejercicios[cambiando] : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ title: plan.nombre }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Reveal index={0}>
          <View style={{ gap: Spacing.sm }}>
            {info.descripcion ? <Text style={[Type.body, { color: colors.textSecondary }]}>{info.descripcion}</Text> : null}
            <View style={styles.badges}>
              <Badge label={`${plan.ejercicios.length} ejercicios`} tone="muted" icon="fitness-outline" />
              <Badge label={`${totalSeries} series`} tone="muted" />
              {info.duracion ? <Badge label={info.duracion} tone="muted" icon="time-outline" /> : null}
              {info.nivel ? <Badge label={info.nivel} tone="muted" /> : null}
              {info.coach ? <Badge label={`Coach ${info.coach}`} tone="info" icon="person-outline" /> : null}
            </View>
          </View>
        </Reveal>

        {cambiados > 0 ? (
          <Reveal index={1}>
            <View style={[styles.tuVersion, { backgroundColor: brand.primary + '14' }]}>
              <Ionicons name="color-wand-outline" size={18} color={brand.primaryDark} />
              <Text style={[Type.footnote, { color: colors.text, flex: 1 }]}>
                Tu versión: cambiaste {cambiados} {cambiados === 1 ? 'ejercicio' : 'ejercicios'}.
              </Text>
              <AnimatedPressable onPress={() => setPlan(base)} hitSlop={8}>
                <Text style={[Type.caption, { color: brand.primaryDark }]}>Volver a la original</Text>
              </AnimatedPressable>
            </View>
          </Reveal>
        ) : null}

        <Text style={[Type.overline, { color: colors.textSecondary, marginTop: Spacing.sm }]}>EJERCICIOS</Text>
        {plan.ejercicios.map((e, i) => (
          <Reveal key={e.clave} index={i + 1}>
            <Card style={styles.ejercicio}>
              <View style={[styles.numero, { backgroundColor: brand.primary + '1A' }]}>
                <Text style={[Type.callout, { color: brand.primaryDark }]}>{i + 1}</Text>
              </View>
              <MiniaturaEjercicio imagenes={e.imagenes} nombre={e.nombre} tamano={48} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.headline, { color: colors.text }]}>{e.nombre}</Text>
                <Text style={[Type.caption, { color: colors.textSecondary }]}>
                  {[e.machineNombre, e.musculo].filter(Boolean).join(' · ')}
                </Text>
                <Text style={[Type.footnote, { color: colors.text }]}>
                  {e.series} × {e.repeticiones || '—'}
                  {e.descansoSegundos ? `  ·  descanso ${textoDescanso(e.descansoSegundos)}` : ''}
                </Text>
                {e.reemplazaA ? (
                  <Text style={[Type.caption, { color: brand.primaryDark }]}>En lugar de {e.reemplazaA}</Text>
                ) : null}
                {anteriores[claveEjercicio(e.nombre)] ? (
                  <Text style={[Type.caption, { color: colors.textSecondary }]}>
                    La vez anterior: {anteriores[claveEjercicio(e.nombre)].map(textoSerie).join(' · ')}
                  </Text>
                ) : null}
                {e.instrucciones || e.imagenes?.length ? (
                  <AnimatedPressable
                    onPress={() => setAbierto((a) => (a === e.clave ? null : e.clave))}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abierto === e.clave }}
                    style={styles.comoSeHace}>
                    <Ionicons name="information-circle-outline" size={15} color={colors.tint} />
                    <Text style={[Type.caption, { color: colors.tint }]}>
                      {abierto === e.clave ? 'Ocultar' : 'Cómo se hace'}
                    </Text>
                  </AnimatedPressable>
                ) : null}
                {abierto === e.clave ? (
                  <>
                    {e.instrucciones ? (
                      <Text style={[Type.footnote, { color: colors.text }]}>{e.instrucciones}</Text>
                    ) : null}
                    <FotosEjercicio imagenes={e.imagenes} nombre={e.nombre} />
                  </>
                ) : null}
              </View>
              <AnimatedPressable
                onPress={() => setCambiando(i)}
                scaleTo={0.92}
                accessibilityRole="button"
                accessibilityLabel={`Cambiar ${e.nombre}`}
                style={[styles.cambiar, { borderColor: colors.border }]}>
                <Ionicons name="swap-horizontal" size={18} color={colors.tint} />
              </AnimatedPressable>
            </Card>
          </Reveal>
        ))}

        <View style={[styles.recordar, { borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.callout, { color: colors.text }]}>Recordar mis cambios</Text>
            <Text style={[Type.caption, { color: colors.textSecondary }]}>La próxima vez abre tu versión de esta rutina.</Text>
          </View>
          <Switch value={recordar} onValueChange={setRecordar} trackColor={{ true: brand.primary }} />
        </View>
      </ScrollView>

      <View style={[styles.pie, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <PrimaryButton label="Iniciar entrenamiento" icon="play" onPress={alPresionarIniciar} loading={iniciando} />
      </View>

      <SelectorReemplazo
        ejercicio={seleccionado}
        machines={machines}
        original={seleccionado?.reemplazaA}
        onCerrar={() => setCambiando(null)}
        onElegir={(a) => {
          if (cambiando == null) return;
          const actual = plan.ejercicios[cambiando];
          // Si eliges el mismo de la rutina, deja de contar como cambio.
          const delCoach = base.ejercicios[cambiando];
          cambiar(cambiando, a.nombre === delCoach?.nombre ? delCoach : reemplazar(actual, a));
          setCambiando(null);
        }}
        onRestaurar={() => {
          if (cambiando == null) return;
          cambiar(cambiando, base.ejercicios[cambiando]);
          setCambiando(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tuVersion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md },
  ejercicio: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  comoSeHace: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  numero: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cambiar: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  recordar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.lg,
    marginTop: Spacing.sm,
  },
  pie: { padding: Spacing.xl, paddingTop: Spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
