import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { useEntrenamiento } from '@/lib/EntrenamientoContext';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StateCard } from '@/components/ui/StateCard';
import { ErrorBox } from '@/components/ui/Field';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FormularioConTeclado } from '@/components/ui/FormularioConTeclado';
import { Contador, useAhora } from '@/components/entrenamiento/Contador';
import { SelectorReemplazo } from '@/components/entrenamiento/SelectorReemplazo';
import { FotosEjercicio, MiniaturaEjercicio } from '@/components/entrenamiento/FotosEjercicio';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import { ApiError, fetchMyMachines, type Machine } from '@/lib/api';
import { alerta } from '@/lib/dialogo';
import {
  PASO_SEGUNDOS,
  PASOS_PESO,
  esPorTiempo,
  reloj,
  siguientePendiente,
  textoDescanso,
  textoSerie,
} from '@/lib/entrenamiento';

// El entrenamiento en curso: el tiempo corriendo, cada ejercicio con sus series
// (reps y peso con botones de paso), el descanso entre series y "Terminar".
export default function EntrenandoScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const {
    sesion,
    restaurando,
    resumen,
    actualizarSerie,
    alternarSerie,
    agregarSerie,
    quitarSerie,
    cambiarEjercicio,
    saltarDescanso,
    sumarDescanso,
    cambiarPaso,
    terminar,
    descartar,
  } = useEntrenamiento();
  const ahora = useAhora(!!sesion);
  const reducir = useReducedMotion();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [cambiando, setCambiando] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = account?.id;
  const tieneGym = account?.hasGymAccess ?? false;
  useEffect(() => {
    if (!userId || !tieneGym) return;
    fetchMyMachines(userId).then(setMachines).catch(() => {});
  }, [userId, tieneGym]);

  // Al acabarse el descanso: vibración y fuera la cuenta.
  const descansoHasta = sesion?.descanso?.hasta ?? 0;
  const restante = descansoHasta ? Math.ceil((descansoHasta - ahora) / 1000) : 0;
  const avisado = useRef(0);
  useEffect(() => {
    if (descansoHasta && restante <= 0 && avisado.current !== descansoHasta) {
      avisado.current = descansoHasta;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      saltarDescanso();
    }
  }, [descansoHasta, restante, saltarDescanso]);

  const actual = useMemo(() => (sesion ? siguientePendiente(sesion) : null), [sesion]);

  // Cuenta regresiva de una serie por tiempo (plancha, cardio): al llegar a
  // cero vibra y la marca como hecha.
  const [cronometro, setCronometro] = useState<{ e: number; s: number; hasta: number } | null>(null);
  useEffect(() => {
    if (!cronometro || ahora < cronometro.hasta) return;
    const serie = sesion?.ejercicios[cronometro.e]?.registro[cronometro.s];
    setCronometro(null);
    if (serie && !serie.completada) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      alternarSerie(cronometro.e, cronometro.s);
    }
  }, [ahora, cronometro, sesion, alternarSerie]);

  // "Cómo se hace" abierto por ejercicio.
  const [abiertas, setAbiertas] = useState<Record<number, boolean>>({});

  if (restaurando) {
    return (
      <SafeAreaView style={[styles.safe, styles.centrado, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (!sesion) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Entrenamiento' }} />
        <View style={{ padding: Spacing.xl }}>
          {resumen ? (
            <StateCard
              icon="trophy-outline"
              tone="success"
              title="Entrenamiento guardado"
              message="Tu resumen está listo."
              actionLabel="Ver resumen"
              onAction={() => router.replace('/resumen-entrenamiento')}
            />
          ) : (
            <StateCard
              icon="barbell-outline"
              tone="muted"
              title="No hay entrenamiento en curso"
              message="Elige una rutina y toca Iniciar."
              actionLabel="Ver rutinas"
              onAction={() => router.replace('/(tabs)/routines')}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const transcurrido = Math.floor((ahora - sesion.inicio) / 1000);
  const totalSeries = sesion.ejercicios.reduce((n, e) => n + e.registro.length, 0);
  const hechas = sesion.ejercicios.reduce((n, e) => n + e.registro.filter((r) => r.completada).length, 0);

  async function guardar() {
    setError(null);
    setGuardando(true);
    try {
      await terminar();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/resumen-entrenamiento');
    } catch (e) {
      setError(e instanceof ApiError || e instanceof Error ? e.message : 'No se pudo guardar tu entrenamiento.');
    } finally {
      setGuardando(false);
    }
  }

  function alTerminar() {
    if (hechas === 0) {
      alerta('Aún no marcas ninguna serie', '¿Quieres descartar este entrenamiento?', [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: alDescartar },
      ], { icono: 'barbell-outline', tono: 'peligro' });
      return;
    }
    const faltan = totalSeries - hechas;
    if (faltan > 0) {
      alerta('¿Terminar ya?', `Te ${faltan === 1 ? 'falta 1 serie' : `faltan ${faltan} series`}. Solo se guardan las que marcaste.`, [
        { text: 'Seguir entrenando', style: 'cancel' },
        { text: 'Terminar', onPress: guardar },
      ], { icono: 'flag-outline', tono: 'marca' });
      return;
    }
    guardar();
  }

  function alDescartar() {
    descartar();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/routines');
  }

  const seleccionado = cambiando != null ? sesion.ejercicios[cambiando] : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: sesion.nombre,
          headerRight: () => (
            <AnimatedPressable onPress={alTerminar} hitSlop={10} accessibilityRole="button">
              <Text style={[Type.headline, { color: colors.tint }]}>Terminar</Text>
            </AnimatedPressable>
          ),
        }}
      />

      {/* Tiempo entrenado y avance, siempre a la vista */}
      <View style={[styles.marcador, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[Type.overline, { color: colors.textSecondary }]}>TIEMPO</Text>
          <Text style={[Type.stat, { color: colors.text, fontVariant: ['tabular-nums'] }]}>{reloj(transcurrido)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[Type.overline, { color: colors.textSecondary }]}>SERIES</Text>
          <Text style={[Type.stat, { color: colors.text }]}>
            {hechas}
            <Text style={[Type.headline, { color: colors.textSecondary }]}> / {totalSeries}</Text>
          </Text>
        </View>
      </View>

      {sesion.descanso && restante > 0 ? (
        <Animated.View
          entering={reducir ? undefined : FadeIn.duration(180)}
          exiting={reducir ? undefined : FadeOut.duration(160)}
          style={[styles.descanso, { backgroundColor: '#141417' }]}
          accessibilityLiveRegion="polite">
          <View style={{ flex: 1 }}>
            <Text style={[Type.caption, { color: 'rgba(255,255,255,0.7)' }]}>DESCANSO</Text>
            <Text style={[Type.title, { color: '#FFFFFF', fontVariant: ['tabular-nums'] }]}>{reloj(restante)}</Text>
            <View style={styles.barraFondo}>
              <View
                style={[
                  styles.barra,
                  { backgroundColor: brand.primary, width: `${Math.min(100, (restante / Math.max(1, sesion.descanso.total)) * 100)}%` },
                ]}
              />
            </View>
          </View>
          <AnimatedPressable onPress={() => sumarDescanso(-15)} style={styles.botonDescanso} accessibilityLabel="Quitar 15 segundos">
            <Text style={[Type.callout, { color: '#FFFFFF' }]}>−15</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => sumarDescanso(15)} style={styles.botonDescanso} accessibilityLabel="Sumar 15 segundos">
            <Text style={[Type.callout, { color: '#FFFFFF' }]}>+15</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={saltarDescanso} style={[styles.botonDescanso, { backgroundColor: brand.primary }]}>
            <Text style={[Type.callout, { color: '#FFFFFF' }]}>Saltar</Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}

      <FormularioConTeclado contentContainerStyle={styles.scroll}>
        <View style={styles.pasos}>
          <Text style={[Type.caption, { color: colors.textSecondary }]}>Saltos de peso (kg)</Text>
          {PASOS_PESO.map((p) => {
            const activo = sesion.pasoPeso === p;
            return (
              <AnimatedPressable
                key={p}
                onPress={() => cambiarPaso(p)}
                scaleTo={0.92}
                accessibilityRole="radio"
                accessibilityLabel={`Saltos de ${p} kilos`}
                accessibilityState={{ checked: activo }}
                style={[
                  styles.chip,
                  { borderColor: activo ? brand.primary : colors.border, backgroundColor: activo ? brand.primary + '1A' : 'transparent' },
                ]}>
                <Text style={[Type.caption, { color: activo ? brand.primaryDark : colors.text }]}>±{p}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {sesion.ejercicios.map((ej, e) => {
          const esActual = actual?.e === e;
          const completo = ej.registro.every((r) => r.completada);
          return (
            <Animated.View key={`${ej.clave}-${e}`} layout={reducir ? undefined : LinearTransition.duration(200)}>
              <Card style={[styles.ejercicio, esActual && { borderColor: brand.primary, borderWidth: 1.5 }]}>
                <View style={styles.ejCabeza}>
                  <MiniaturaEjercicio imagenes={ej.imagenes} nombre={ej.nombre} tamano={52} />
                  <View style={{ flex: 1 }}>
                    <Text style={[Type.caption, { color: completo ? brand.success : colors.textSecondary }]}>
                      {completo ? 'COMPLETO' : `EJERCICIO ${e + 1} DE ${sesion.ejercicios.length}`}
                    </Text>
                    <Text style={[Type.headline, { color: colors.text }]}>{ej.nombre}</Text>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>
                      {[ej.machineNombre, ej.musculo, `${ej.series} × ${ej.repeticiones || '—'}`].filter(Boolean).join(' · ')}
                      {ej.descansoSegundos ? ` · descanso ${textoDescanso(ej.descansoSegundos)}` : ''}
                    </Text>
                    {ej.reemplazaA ? (
                      <Text style={[Type.caption, { color: brand.primaryDark }]}>En lugar de {ej.reemplazaA}</Text>
                    ) : null}
                    {ej.anterior?.length ? (
                      <Text style={[Type.caption, { color: colors.text, marginTop: 2 }]}>
                        <Text style={{ color: colors.textSecondary }}>La vez anterior: </Text>
                        {ej.anterior.map(textoSerie).join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  {ej.instrucciones || ej.imagenes?.length ? (
                    <AnimatedPressable
                      onPress={() => setAbiertas((a) => ({ ...a, [e]: !a[e] }))}
                      hitSlop={8}
                      scaleTo={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: !!abiertas[e] }}
                      accessibilityLabel={`Cómo se hace ${ej.nombre}`}>
                      <Ionicons name={abiertas[e] ? 'information-circle' : 'information-circle-outline'} size={23} color={colors.tint} />
                    </AnimatedPressable>
                  ) : null}
                  <AnimatedPressable
                    onPress={() => setCambiando(e)}
                    hitSlop={8}
                    scaleTo={0.85}
                    accessibilityRole="button"
                    accessibilityLabel={`Cambiar ${ej.nombre}`}>
                    <Ionicons name="swap-horizontal" size={22} color={colors.tint} />
                  </AnimatedPressable>
                </View>

                {(ej.instrucciones || ej.imagenes?.length) && abiertas[e] ? (
                  <Animated.View
                    entering={reducir ? undefined : FadeIn.duration(160)}
                    style={[styles.instrucciones, { backgroundColor: colors.background }]}>
                    <Text style={[Type.caption, { color: colors.textSecondary }]}>CÓMO SE HACE</Text>
                    {ej.instrucciones ? (
                      <Text style={[Type.footnote, { color: colors.text }]}>{ej.instrucciones}</Text>
                    ) : null}
                    <FotosEjercicio imagenes={ej.imagenes} nombre={ej.nombre} />
                  </Animated.View>
                ) : null}

                <View style={styles.encabezado}>
                  <Text style={[styles.colSerie, Type.caption, { color: colors.textSecondary }]}>SERIE</Text>
                  <Text style={[styles.colCampo, Type.caption, { color: colors.textSecondary }]}>
                    {esPorTiempo(ej) ? 'SEGUNDOS' : 'REPS'}
                  </Text>
                  <Text style={[styles.colCampo, Type.caption, { color: colors.textSecondary }]}>
                    {esPorTiempo(ej) ? 'TIEMPO' : 'KG'}
                  </Text>
                  <View style={styles.colCheck} />
                </View>

                {ej.registro.map((r, s) => {
                  const esLaSiguiente = esActual && actual?.s === s;
                  return (
                    <View
                      key={s}
                      style={[
                        styles.fila,
                        r.completada && { backgroundColor: brand.success + '1A' },
                        esLaSiguiente && { backgroundColor: brand.primary + '0F' },
                      ]}>
                      <AnimatedPressable
                        onLongPress={() =>
                          ej.registro.length > 1 &&
                          alerta(`¿Quitar la serie ${s + 1}?`, undefined, [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Quitar', style: 'destructive', onPress: () => quitarSerie(e, s) },
                          ], { icono: 'remove-circle-outline', tono: 'peligro' })
                        }
                        style={styles.colSerie}
                        accessibilityHint="Mantén presionado para quitarla">
                        <Text style={[Type.headline, { color: colors.textSecondary, textAlign: 'center' }]}>{s + 1}</Text>
                      </AnimatedPressable>
                      {esPorTiempo(ej) ? (
                        <>
                          <View style={styles.colCampo}>
                            <Contador
                              valor={r.segundos ?? null}
                              paso={PASO_SEGUNDOS}
                              etiqueta={`segundos de la serie ${s + 1}`}
                              deshabilitado={cronometro?.e === e && cronometro.s === s}
                              onCambio={(v) => actualizarSerie(e, s, { segundos: v })}
                            />
                          </View>
                          <View style={styles.colCampo}>
                            <Temporizador
                              corriendo={cronometro?.e === e && cronometro.s === s}
                              quedan={
                                cronometro?.e === e && cronometro.s === s
                                  ? Math.max(0, Math.ceil((cronometro.hasta - ahora) / 1000))
                                  : r.segundos ?? 0
                              }
                              deshabilitado={r.completada || !r.segundos}
                              onPress={() => {
                                if (cronometro?.e === e && cronometro.s === s) setCronometro(null);
                                else if (r.segundos && !r.completada) {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                                  setCronometro({ e, s, hasta: Date.now() + r.segundos * 1000 });
                                }
                              }}
                            />
                          </View>
                        </>
                      ) : (
                        <>
                          <View style={styles.colCampo}>
                            <Contador
                              valor={r.repeticiones}
                              paso={1}
                              etiqueta={`repeticiones de la serie ${s + 1}`}
                              onCambio={(v) => actualizarSerie(e, s, { repeticiones: v })}
                            />
                          </View>
                          <View style={styles.colCampo}>
                            <Contador
                              valor={r.peso}
                              paso={sesion.pasoPeso}
                              decimales
                              etiqueta={`kilos de la serie ${s + 1}`}
                              onCambio={(v) => actualizarSerie(e, s, { peso: v })}
                            />
                          </View>
                        </>
                      )}
                      <AnimatedPressable
                        onPress={() => {
                          if (!r.completada) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                          alternarSerie(e, s);
                        }}
                        scaleTo={0.8}
                        hitSlop={6}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: r.completada }}
                        accessibilityLabel={`Serie ${s + 1} hecha`}
                        style={[
                          styles.colCheck,
                          styles.check,
                          { backgroundColor: r.completada ? brand.success : colors.background, borderColor: r.completada ? brand.success : colors.border },
                        ]}>
                        <Ionicons name="checkmark" size={20} color={r.completada ? '#FFFFFF' : colors.textSecondary} />
                      </AnimatedPressable>
                    </View>
                  );
                })}

                <AnimatedPressable onPress={() => agregarSerie(e)} scaleTo={0.97} style={styles.agregar}>
                  <Ionicons name="add" size={16} color={colors.tint} />
                  <Text style={[Type.caption, { color: colors.tint }]}>Agregar serie</Text>
                </AnimatedPressable>
              </Card>
            </Animated.View>
          );
        })}

        {error ? <ErrorBox message={error} /> : null}
        <PrimaryButton label="Terminar entrenamiento" icon="flag" onPress={alTerminar} loading={guardando} />
        <AnimatedPressable
          onPress={() =>
            alerta('¿Descartar el entrenamiento?', 'No se guardará nada de lo que llevas.', [
              { text: 'Seguir entrenando', style: 'cancel' },
              { text: 'Descartar', style: 'destructive', onPress: alDescartar },
            ], { icono: 'barbell-outline', tono: 'peligro' })
          }
          style={styles.descartar}>
          <Text style={[Type.callout, { color: brand.danger }]}>Descartar entrenamiento</Text>
        </AnimatedPressable>
      </FormularioConTeclado>

      <SelectorReemplazo
        ejercicio={seleccionado}
        machines={machines}
        onCerrar={() => setCambiando(null)}
        onElegir={(a) => {
          if (cambiando != null) cambiarEjercicio(cambiando, a);
          setCambiando(null);
        }}
      />
    </SafeAreaView>
  );
}

// Botón de una serie por tiempo: ▶ 0:40 para empezar; corriendo, ■ con lo que queda.
function Temporizador({
  corriendo,
  quedan,
  deshabilitado,
  onPress,
}: {
  corriendo: boolean;
  quedan: number;
  deshabilitado: boolean;
  onPress: () => void;
}) {
  const { colors, brand } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={deshabilitado && !corriendo}
      scaleTo={0.94}
      accessibilityRole="button"
      accessibilityLabel={corriendo ? 'Detener el tiempo' : `Empezar ${quedan} segundos`}
      style={[
        styles.temporizador,
        {
          backgroundColor: corriendo ? brand.primary : colors.background,
          borderColor: corriendo ? brand.primary : colors.border,
          opacity: deshabilitado && !corriendo ? 0.5 : 1,
        },
      ]}>
      <Ionicons name={corriendo ? 'stop' : 'play'} size={14} color={corriendo ? '#FFFFFF' : colors.tint} />
      <Text style={[Type.headline, { color: corriendo ? '#FFFFFF' : colors.text, fontVariant: ['tabular-nums'] }]}>
        {reloj(quedan)}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centrado: { alignItems: 'center', justifyContent: 'center' },
  marcador: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  descanso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  barraFondo: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 6, overflow: 'hidden' },
  barra: { height: 4, borderRadius: 2 },
  botonDescanso: {
    minWidth: 48,
    height: 40,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  pasos: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6 },
  ejercicio: { gap: Spacing.xs },
  ejCabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.sm },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 5, paddingHorizontal: 4, borderRadius: Radius.sm },
  colSerie: { width: 34, textAlign: 'center' },
  colCampo: { flex: 1, textAlign: 'center' },
  colCheck: { width: 42 },
  check: { height: 42, borderRadius: Radius.sm, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  agregar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.sm },
  descartar: { alignItems: 'center', paddingVertical: Spacing.md },
  instrucciones: { gap: 2, padding: Spacing.md, borderRadius: Radius.sm, marginBottom: Spacing.sm },
  temporizador: {
    height: 42,
    borderWidth: 1,
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
