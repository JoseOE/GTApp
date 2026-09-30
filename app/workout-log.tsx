import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError, fetchMyMachines, saveWorkout, type LoggedExercise, type Machine } from '@/lib/api';
import { EJERCICIOS_LIBRES } from '@/constants/StarterRoutines';

// Registrar un entrenamiento: eliges ejercicios (de las máquinas de tu gimnasio
// o del catálogo libre) y anotas serie por serie las repeticiones y el peso.
export default function WorkoutLogScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [nombre, setNombre] = useState('');
  const [duracion, setDuracion] = useState('');
  const [ejercicios, setEjercicios] = useState<LoggedExercise[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [pickerAbierto, setPickerAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = account?.id;
  const tieneGym = account?.hasGymAccess ?? false;

  useEffect(() => {
    if (!userId || !tieneGym) return;
    let cancelado = false;
    fetchMyMachines(userId)
      .then((data) => {
        if (!cancelado) setMachines(data);
      })
      .catch(() => {
        if (!cancelado) setMachines([]);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, tieneGym]);

  const volumen = useMemo(
    () =>
      ejercicios.reduce(
        (total, e) =>
          total +
          e.series.reduce(
            (sub, s) => sub + (s.completada && s.peso && s.repeticiones ? s.peso * s.repeticiones : 0),
            0
          ),
        0
      ),
    [ejercicios]
  );

  function agregarEjercicio(nuevo: LoggedExercise) {
    setEjercicios((prev) => [...prev, nuevo]);
    setPickerAbierto(false);
  }

  function actualizarSerie(iEjercicio: number, iSerie: number, campo: 'repeticiones' | 'peso', valor: string) {
    setEjercicios((prev) =>
      prev.map((e, i) => {
        if (i !== iEjercicio) return e;
        const series = e.series.map((s, j) =>
          j === iSerie ? { ...s, [campo]: valor === '' ? null : Number(valor.replace(',', '.')) } : s
        );
        return { ...e, series };
      })
    );
  }

  function alternarSerie(iEjercicio: number, iSerie: number) {
    setEjercicios((prev) =>
      prev.map((e, i) =>
        i === iEjercicio
          ? { ...e, series: e.series.map((s, j) => (j === iSerie ? { ...s, completada: !s.completada } : s)) }
          : e
      )
    );
  }

  function agregarSerie(iEjercicio: number) {
    setEjercicios((prev) =>
      prev.map((e, i) => {
        if (i !== iEjercicio) return e;
        // La serie nueva copia la anterior: casi siempre repites el mismo peso.
        const ultima = e.series[e.series.length - 1];
        return {
          ...e,
          series: [...e.series, { repeticiones: ultima?.repeticiones ?? null, peso: ultima?.peso ?? null, completada: true }],
        };
      })
    );
  }

  function quitarSerie(iEjercicio: number, iSerie: number) {
    setEjercicios((prev) =>
      prev.map((e, i) => (i === iEjercicio ? { ...e, series: e.series.filter((_, j) => j !== iSerie) } : e))
        .filter((e) => e.series.length > 0)
    );
  }

  function quitarEjercicio(iEjercicio: number) {
    setEjercicios((prev) => prev.filter((_, i) => i !== iEjercicio));
  }

  async function guardar() {
    if (!userId) return;
    if (ejercicios.length === 0) {
      setError('Agrega al menos un ejercicio.');
      return;
    }
    setError(null);
    setGuardando(true);
    try {
      await saveWorkout(userId, {
        nombre: nombre.trim() || 'Entrenamiento',
        duracionMinutos: duracion ? parseInt(duracion, 10) : undefined,
        ejercicios,
      });
      // Si se llegó por enlace directo no hay a dónde volver: se cae al historial.
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/workout');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar tu entrenamiento.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.encabezado}>
            <Field
              label="¿Qué entrenaste?"
              icon="create-outline"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Empuje · Pecho y tríceps"
            />
            <Field
              label="Duración (minutos)"
              icon="time-outline"
              value={duracion}
              onChangeText={(t) => setDuracion(t.replace(/[^0-9]/g, ''))}
              placeholder="45"
              keyboardType="number-pad"
            />
          </View>

          {ejercicios.length === 0 ? (
            <Reveal index={0}>
              <Card style={styles.vacio}>
                <IconCircle name="barbell-outline" tone="muted" size={52} />
                <Text style={[styles.vacioTitulo, { color: colors.text }]}>Agrega tu primer ejercicio</Text>
                <Text style={[styles.vacioTexto, { color: colors.textSecondary }]}>
                  {tieneGym
                    ? 'Elige entre las máquinas de tu gimnasio o del catálogo libre.'
                    : 'Elige del catálogo libre: no necesitas estar en un gimnasio.'}
                </Text>
              </Card>
            </Reveal>
          ) : (
            ejercicios.map((ejercicio, i) => (
              <Reveal index={i} key={`${ejercicio.nombre}-${i}`}>
                <Card style={styles.ejercicioCard}>
                  <View style={styles.ejercicioTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.ejercicioNombre, { color: colors.text }]}>{ejercicio.nombre}</Text>
                      <Text style={[styles.ejercicioMeta, { color: colors.textSecondary }]}>
                        {ejercicio.machineNombre ? `${ejercicio.machineNombre} · ` : ''}
                        {ejercicio.musculo || 'Sin grupo'}
                      </Text>
                    </View>
                    <AnimatedPressable onPress={() => quitarEjercicio(i)} hitSlop={10} scaleTo={0.85}>
                      <Ionicons name="trash-outline" size={19} color={brand.danger} />
                    </AnimatedPressable>
                  </View>

                  <View style={[styles.tablaEncabezado, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.colSerie, styles.encabezadoTexto, { color: colors.textSecondary }]}>SERIE</Text>
                    <Text style={[styles.colCampo, styles.encabezadoTexto, { color: colors.textSecondary }]}>REPS</Text>
                    <Text style={[styles.colCampo, styles.encabezadoTexto, { color: colors.textSecondary }]}>KG</Text>
                    <View style={styles.colAcciones} />
                  </View>

                  {ejercicio.series.map((serie, j) => (
                    <View key={j} style={styles.filaSerie}>
                      <Text style={[styles.colSerie, styles.numeroSerie, { color: colors.textSecondary }]}>
                        {j + 1}
                      </Text>
                      <TextInput
                        style={[styles.colCampo, styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={serie.repeticiones?.toString() ?? ''}
                        onChangeText={(t) => actualizarSerie(i, j, 'repeticiones', t.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                        placeholder="-"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <TextInput
                        style={[styles.colCampo, styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                        value={serie.peso?.toString() ?? ''}
                        onChangeText={(t) => actualizarSerie(i, j, 'peso', t.replace(/[^0-9.,]/g, ''))}
                        keyboardType="decimal-pad"
                        placeholder="-"
                        placeholderTextColor={colors.textSecondary}
                      />
                      <View style={styles.colAcciones}>
                        <AnimatedPressable onPress={() => alternarSerie(i, j)} hitSlop={8} scaleTo={0.85}>
                          <Ionicons
                            name={serie.completada ? 'checkmark-circle' : 'ellipse-outline'}
                            size={24}
                            color={serie.completada ? brand.success : colors.textSecondary}
                          />
                        </AnimatedPressable>
                        <AnimatedPressable onPress={() => quitarSerie(i, j)} hitSlop={8} scaleTo={0.85} haptic={false}>
                          <Ionicons name="close" size={18} color={colors.textSecondary} />
                        </AnimatedPressable>
                      </View>
                    </View>
                  ))}

                  <AnimatedPressable onPress={() => agregarSerie(i)} scaleTo={0.97} style={styles.agregarSerie}>
                    <Ionicons name="add" size={16} color={colors.tint} />
                    <Text style={[styles.agregarSerieTexto, { color: colors.tint }]}>Agregar serie</Text>
                  </AnimatedPressable>
                </Card>
              </Reveal>
            ))
          )}

          <PrimaryButton
            label="Agregar ejercicio"
            icon="add-circle-outline"
            variant="outline"
            onPress={() => setPickerAbierto(true)}
          />

          {ejercicios.length > 0 ? (
            <View style={[styles.resumen, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenValor, { color: colors.text }]}>{ejercicios.length}</Text>
                <Text style={[styles.resumenEtiqueta, { color: colors.textSecondary }]}>ejercicios</Text>
              </View>
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenValor, { color: colors.text }]}>
                  {ejercicios.reduce((n, e) => n + e.series.length, 0)}
                </Text>
                <Text style={[styles.resumenEtiqueta, { color: colors.textSecondary }]}>series</Text>
              </View>
              <View style={styles.resumenItem}>
                <Text style={[styles.resumenValor, { color: colors.text }]}>
                  {Math.round(volumen).toLocaleString('es-MX')}
                </Text>
                <Text style={[styles.resumenEtiqueta, { color: colors.textSecondary }]}>kg movidos</Text>
              </View>
            </View>
          ) : null}

          {error ? <ErrorBox message={error} /> : null}

          <PrimaryButton
            label="Guardar entrenamiento"
            icon="checkmark-circle-outline"
            onPress={guardar}
            loading={guardando}
            disabled={ejercicios.length === 0}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={pickerAbierto}
        machines={machines}
        gymNombre={account?.gym?.nombre}
        onClose={() => setPickerAbierto(false)}
        onPick={agregarEjercicio}
      />
    </SafeAreaView>
  );
}

// Selector de ejercicios: primero las máquinas reales del gimnasio (con los
// ejercicios que ese gimnasio capturó para cada una) y luego el catálogo libre.
function ExercisePicker({
  visible,
  machines,
  gymNombre,
  onClose,
  onPick,
}: {
  visible: boolean;
  machines: Machine[];
  gymNombre?: string;
  onClose: () => void;
  onPick: (ejercicio: LoggedExercise) => void;
}) {
  const { colors, brand } = useTheme();
  const [busqueda, setBusqueda] = useState('');

  const filtro = busqueda.trim().toLowerCase();
  const coincide = (texto: string) => !filtro || texto.toLowerCase().includes(filtro);

  const maquinasFiltradas = machines
    .map((m) => ({
      ...m,
      ejercicios: (m.ejercicios ?? []).filter((e) => coincide(e.nombre) || coincide(m.nombre) || coincide(e.musculo ?? '')),
    }))
    .filter((m) => m.ejercicios.length > 0);

  const libresFiltrados = EJERCICIOS_LIBRES.filter((e) => coincide(e.nombre) || coincide(e.musculo));

  function elegir(nombre: string, musculo: string, machineId?: string, machineNombre?: string) {
    onPick({
      machineId: machineId ?? null,
      machineNombre: machineNombre ?? null,
      nombre,
      musculo,
      series: [{ repeticiones: null, peso: null, completada: true }],
    });
    setBusqueda('');
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitulo, { color: colors.text }]}>Elegir ejercicio</Text>
          <AnimatedPressable onPress={onClose} hitSlop={12} scaleTo={0.85}>
            <Ionicons name="close" size={24} color={colors.text} />
          </AnimatedPressable>
        </View>

        <View style={styles.pickerBusqueda}>
          <Field
            label=""
            icon="search-outline"
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar ejercicio o máquina"
            autoCapitalize="none"
          />
        </View>

        <ScrollView contentContainerStyle={styles.pickerScroll} keyboardShouldPersistTaps="handled">
          {maquinasFiltradas.length > 0 ? (
            <>
              <Text style={[styles.pickerSeccion, { color: brand.primary }]}>
                {(gymNombre ?? 'TU GIMNASIO').toUpperCase()}
              </Text>
              {maquinasFiltradas.map((m) => (
                <View key={m.id} style={styles.pickerGrupo}>
                  <Text style={[styles.pickerMaquina, { color: colors.textSecondary }]}>
                    {m.nombre}
                    {m.zona ? ` · ${m.zona}` : ''}
                  </Text>
                  {m.ejercicios.map((e) => (
                    <PickerRow
                      key={e.id}
                      nombre={e.nombre}
                      detalle={[e.musculo, e.series ? `${e.series} x ${e.repeticiones ?? ''}`.trim() : '']
                        .filter(Boolean)
                        .join(' · ')}
                      onPress={() => elegir(e.nombre, e.musculo, m.id, m.nombre)}
                    />
                  ))}
                </View>
              ))}
            </>
          ) : null}

          <Text style={[styles.pickerSeccion, { color: colors.textSecondary }]}>
            CATÁLOGO LIBRE · SIN MÁQUINA
          </Text>
          {libresFiltrados.map((e) => (
            <PickerRow
              key={e.nombre}
              nombre={e.nombre}
              detalle={e.musculo}
              onPress={() => elegir(e.nombre, e.musculo)}
            />
          ))}

          {maquinasFiltradas.length === 0 && libresFiltrados.length === 0 ? (
            <Text style={[styles.pickerVacio, { color: colors.textSecondary }]}>
              Nada coincide con “{busqueda}”. Puedes agregarlo tal cual escribiéndolo abajo.
            </Text>
          ) : null}

          {filtro ? (
            <View style={{ marginTop: Spacing.lg }}>
              <PrimaryButton
                label={`Usar “${busqueda.trim()}”`}
                icon="add-outline"
                variant="outline"
                onPress={() => elegir(busqueda.trim(), 'Otro')}
              />
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function PickerRow({ nombre, detalle, onPress }: { nombre: string; detalle: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      haptic={false}
      style={[styles.pickerFila, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.pickerNombre, { color: colors.text }]}>{nombre}</Text>
        {detalle ? <Text style={[styles.pickerDetalle, { color: colors.textSecondary }]}>{detalle}</Text> : null}
      </View>
      <Ionicons name="add-circle-outline" size={22} color={colors.tint} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  encabezado: { gap: Spacing.lg },
  vacio: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  vacioTitulo: { fontFamily: FontFamily.bold, fontSize: 16, marginTop: Spacing.sm },
  vacioTexto: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 260 },

  ejercicioCard: { gap: 0 },
  ejercicioTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  ejercicioNombre: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  ejercicioMeta: { fontSize: 12, marginTop: 2 },

  tablaEncabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: Spacing.xs,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  encabezadoTexto: { fontFamily: FontFamily.semiBold, fontSize: 10, letterSpacing: 0.5, textAlign: 'center' },
  filaSerie: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  colSerie: { width: 36, textAlign: 'center' },
  colCampo: { flex: 1 },
  colAcciones: { width: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm },
  numeroSerie: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingVertical: 8,
    paddingHorizontal: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: 14.5,
    textAlign: 'center',
  },
  agregarSerie: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.md,
    marginTop: Spacing.xs,
  },
  agregarSerieTexto: { fontFamily: FontFamily.semiBold, fontSize: 13 },

  resumen: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
  },
  resumenItem: { flex: 1, alignItems: 'center' },
  resumenValor: { fontFamily: FontFamily.bold, fontSize: 19 },
  resumenEtiqueta: { fontSize: 11.5, marginTop: 2 },

  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.xl,
    borderBottomWidth: 1,
  },
  pickerTitulo: { fontFamily: FontFamily.bold, fontSize: 18 },
  pickerBusqueda: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md },
  pickerScroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  pickerSeccion: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  pickerGrupo: { marginBottom: Spacing.md },
  pickerMaquina: { fontFamily: FontFamily.medium, fontSize: 12, marginBottom: 2 },
  pickerFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  pickerNombre: { fontFamily: FontFamily.medium, fontSize: 14.5 },
  pickerDetalle: { fontSize: 12, marginTop: 1 },
  pickerVacio: { fontSize: 13, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 18 },
});
