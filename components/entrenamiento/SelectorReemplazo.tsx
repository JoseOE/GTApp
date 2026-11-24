import { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import type { Machine } from '@/lib/api';
import { alternativas, type Alternativa } from '@/lib/entrenamiento';

// Hoja para cambiar un ejercicio por otro. Primero los que trabajan el mismo
// músculo (los de las máquinas del gimnasio arriba); los demás, al buscar o
// al pedir "Ver otros músculos".
export function SelectorReemplazo({
  ejercicio,
  machines,
  original,
  onElegir,
  onRestaurar,
  onCerrar,
}: {
  ejercicio: { nombre: string; musculo: string } | null;
  machines: Machine[];
  // Si el ejercicio ya se cambió: el de la rutina, para volver a él.
  original?: string | null;
  onElegir: (a: Alternativa) => void;
  onRestaurar?: () => void;
  onCerrar: () => void;
}) {
  const { colors, brand } = useTheme();
  const [busqueda, setBusqueda] = useState('');
  const [verOtros, setVerOtros] = useState(false);

  const opciones = useMemo(
    () => (ejercicio ? alternativas(ejercicio, machines) : { mismoMusculo: [], otros: [] }),
    [ejercicio, machines]
  );

  const filtro = busqueda.trim().toLowerCase();
  const coincide = (a: Alternativa) =>
    !filtro || [a.nombre, a.musculo, a.machineNombre ?? ''].some((t) => t.toLowerCase().includes(filtro));
  const mismos = opciones.mismoMusculo.filter(coincide);
  const otros = filtro || verOtros ? opciones.otros.filter(coincide) : [];

  function cerrar() {
    setBusqueda('');
    setVerOtros(false);
    onCerrar();
  }

  function elegir(a: Alternativa) {
    setBusqueda('');
    setVerOtros(false);
    onElegir(a);
  }

  return (
    <Modal visible={!!ejercicio} animationType="slide" presentationStyle="pageSheet" onRequestClose={cerrar}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.cabeza}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.overline, { color: colors.textSecondary }]}>CAMBIAR EJERCICIO</Text>
            <Text style={[Type.title, { color: colors.text }]} numberOfLines={2}>
              {ejercicio?.nombre}
            </Text>
          </View>
          <AnimatedPressable onPress={cerrar} hitSlop={12} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Cerrar">
            <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
          </AnimatedPressable>
        </View>

        <View style={[styles.buscador, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textSecondary} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar ejercicio, máquina o músculo"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            style={[styles.buscadorTexto, { color: colors.text }]}
          />
        </View>

        <ScrollView contentContainerStyle={styles.lista} keyboardShouldPersistTaps="handled">
          {original && onRestaurar ? (
            <AnimatedPressable
              onPress={() => {
                setBusqueda('');
                onRestaurar();
              }}
              scaleTo={0.98}
              style={[styles.restaurar, { borderColor: brand.primary }]}>
              <Ionicons name="arrow-undo" size={18} color={brand.primaryDark} />
              <Text style={[Type.callout, { color: brand.primaryDark, flex: 1 }]}>Volver a {original}</Text>
            </AnimatedPressable>
          ) : null}

          <Text style={[Type.overline, styles.seccion, { color: brand.primaryDark }]}>
            MISMO MÚSCULO · {ejercicio?.musculo?.toUpperCase()}
          </Text>
          {mismos.length ? (
            mismos.map((a) => <Fila key={`${a.machineId}-${a.nombre}`} a={a} onPress={() => elegir(a)} />)
          ) : (
            <Text style={[Type.footnote, { color: colors.textSecondary }]}>
              {filtro ? 'Nada de este músculo coincide.' : 'No hay otro ejercicio de este músculo en tu gimnasio.'}
            </Text>
          )}

          {filtro || verOtros ? (
            <>
              <Text style={[Type.overline, styles.seccion, { color: colors.textSecondary }]}>OTROS MÚSCULOS</Text>
              {otros.map((a) => (
                <Fila key={`o-${a.machineId}-${a.nombre}`} a={a} onPress={() => elegir(a)} />
              ))}
              {!otros.length ? <Text style={[Type.footnote, { color: colors.textSecondary }]}>Nada coincide.</Text> : null}
            </>
          ) : (
            <AnimatedPressable onPress={() => setVerOtros(true)} scaleTo={0.98} style={styles.verOtros}>
              <Text style={[Type.callout, { color: colors.tint }]}>Ver otros músculos</Text>
              <Ionicons name="chevron-down" size={16} color={colors.tint} />
            </AnimatedPressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Fila({ a, onPress }: { a: Alternativa; onPress: () => void }) {
  const { colors } = useTheme();
  const detalle = [a.machineNombre ?? 'Sin máquina', a.musculo].join(' · ');
  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Cambiar por ${a.nombre}`}
      style={[styles.fila, { borderBottomColor: colors.border }]}>
      <View style={[styles.icono, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name={a.machineId ? 'barbell-outline' : 'body-outline'} size={18} color={colors.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[Type.callout, { color: colors.text }]}>{a.nombre}</Text>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>{detalle}</Text>
      </View>
      <Ionicons name="swap-horizontal" size={20} color={colors.tint} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.xl, paddingBottom: Spacing.md },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    height: 44,
  },
  buscadorTexto: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, height: '100%' },
  lista: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  seccion: { marginTop: Spacing.lg, marginBottom: Spacing.xs },
  restaurar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  icono: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  verOtros: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: Spacing.lg },
});
