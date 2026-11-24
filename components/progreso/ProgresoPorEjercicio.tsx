import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing, Type } from '@/constants/Theme';
import type { WorkoutSession } from '@/lib/api';
import { duracion, formatoPeso, progresoPorEjercicio, type PuntoProgreso } from '@/lib/entrenamiento';

type Medida = 'peso' | 'unoRM' | 'volumen' | 'tiempo';

const MEDIDAS: { id: Medida; etiqueta: string }[] = [
  { id: 'peso', etiqueta: 'Peso máx.' },
  { id: 'unoRM', etiqueta: '1RM estimado' },
  { id: 'volumen', etiqueta: 'Volumen' },
];

const valor = (p: PuntoProgreso, m: Medida) =>
  m === 'peso' ? p.pesoMax : m === 'unoRM' ? p.unoRM : m === 'volumen' ? p.volumen : p.segundosMax;

const textoValor = (n: number, m: Medida) =>
  m === 'tiempo' ? duracion(n) : m === 'volumen' ? `${Math.round(n).toLocaleString('es-MX')} kg` : `${formatoPeso(n)} kg`;

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');

// Cómo va cada ejercicio entrenamiento tras entrenamiento: peso máximo, 1RM
// estimado o volumen (o el tiempo, en los ejercicios por tiempo).
export function ProgresoPorEjercicio({ historial }: { historial: WorkoutSession[] }) {
  const { colors, brand } = useTheme();
  const { width } = useWindowDimensions();
  const ejercicios = useMemo(() => progresoPorEjercicio(historial), [historial]);
  const [elegido, setElegido] = useState(0);
  const [medida, setMedida] = useState<Medida>('peso');

  if (!ejercicios.length) return null;
  const ej = ejercicios[Math.min(elegido, ejercicios.length - 1)];
  const porTiempo = ej.puntos.every((p) => p.pesoMax === 0) && ej.puntos.some((p) => p.segundosMax > 0);
  const m: Medida = porTiempo ? 'tiempo' : medida;
  // Los últimos 12 entrenamientos de ese ejercicio.
  const puntos = ej.puntos.slice(-12);
  const valores = puntos.map((p) => valor(p, m));
  const max = Math.max(...valores, 0);
  const min = Math.min(...valores, max);
  const ultimo = valores[valores.length - 1] ?? 0;
  const primero = valores[0] ?? 0;
  const cambio = ultimo - primero;
  const record = Math.max(...ej.puntos.map((p) => valor(p, m)), 0);
  const mejorSerie = ej.puntos.reduce<PuntoProgreso['mejorSerie']>(
    (mejor, p) => (p.mejorSerie && (!mejor || p.mejorSerie.peso * p.mejorSerie.repeticiones > mejor.peso * mejor.repeticiones) ? p.mejorSerie : mejor),
    null
  );

  // Gráfica
  const ancho = Math.min(width, 520) - Spacing.xl * 2 - Spacing.lg * 2;
  const alto = 150;
  const margen = { izq: 6, der: 6, arriba: 16, abajo: 20 };
  const rango = max - min || 1;
  const x = (i: number) =>
    margen.izq + (puntos.length === 1 ? (ancho - margen.izq - margen.der) / 2 : (i / (puntos.length - 1)) * (ancho - margen.izq - margen.der));
  const y = (v: number) => margen.arriba + (1 - (v - min) / rango) * (alto - margen.arriba - margen.abajo);
  const camino = puntos.map((_, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(valores[i]).toFixed(1)}`).join(' ');

  return (
    <View style={{ gap: Spacing.md }}>
      <Text style={[Type.overline, { color: colors.textSecondary }]}>POR EJERCICIO</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {ejercicios.map((e, i) => {
          const activo = i === elegido;
          return (
            <AnimatedPressable
              key={e.nombre}
              onPress={() => setElegido(i)}
              scaleTo={0.95}
              accessibilityRole="tab"
              accessibilityState={{ selected: activo }}
              style={[
                styles.chip,
                { borderColor: activo ? brand.primary : colors.border, backgroundColor: activo ? brand.primary + '1A' : colors.surface },
              ]}>
              <Text style={[Type.caption, { color: activo ? brand.primaryDark : colors.text }]} numberOfLines={1}>
                {e.nombre}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      <Card style={{ gap: Spacing.md }}>
        <View style={styles.cabeza}>
          <View style={{ flex: 1 }}>
            <Text style={[Type.headline, { color: colors.text }]}>{ej.nombre}</Text>
            <Text style={[Type.caption, { color: colors.textSecondary }]}>
              {ej.musculo} · {ej.puntos.length} {ej.puntos.length === 1 ? 'entrenamiento' : 'entrenamientos'}
            </Text>
          </View>
          {puntos.length > 1 ? (
            <Text style={[Type.callout, { color: cambio >= 0 ? brand.success : brand.danger }]}>
              {cambio >= 0 ? '▲' : '▼'} {textoValor(Math.abs(cambio), m)}
            </Text>
          ) : null}
        </View>

        {!porTiempo ? (
          <View style={[styles.medidas, { backgroundColor: colors.background }]}>
            {MEDIDAS.map((x2) => {
              const activo = x2.id === medida;
              return (
                <AnimatedPressable
                  key={x2.id}
                  onPress={() => setMedida(x2.id)}
                  scaleTo={0.95}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: activo }}
                  style={[styles.medida, activo && { backgroundColor: colors.surface }]}>
                  <Text style={[Type.caption, { color: activo ? colors.text : colors.textSecondary }]}>{x2.etiqueta}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        ) : null}

        {max > 0 ? (
          <Svg width={ancho} height={alto} accessibilityLabel={`Gráfica de ${ej.nombre}`}>
            <Line x1={0} x2={ancho} y1={y(max)} y2={y(max)} stroke={colors.border} strokeDasharray="4 4" />
            <Line x1={0} x2={ancho} y1={y(min)} y2={y(min)} stroke={colors.border} strokeDasharray="4 4" />
            <SvgText x={ancho} y={y(max) - 4} fontSize={10} fontFamily={FontFamily.regular} fill={colors.textSecondary} textAnchor="end">
              {textoValor(max, m)}
            </SvgText>
            {min !== max ? (
              <SvgText x={ancho} y={y(min) - 4} fontSize={10} fontFamily={FontFamily.regular} fill={colors.textSecondary} textAnchor="end">
                {textoValor(min, m)}
              </SvgText>
            ) : null}
            {puntos.length > 1 ? <Path d={camino} stroke={brand.primary} strokeWidth={2.5} fill="none" strokeLinejoin="round" /> : null}
            {puntos.map((p, i) => (
              <Circle key={i} cx={x(i)} cy={y(valores[i])} r={i === puntos.length - 1 ? 5 : 3.5} fill={brand.primary} />
            ))}
            <SvgText x={x(0)} y={alto - 4} fontSize={10} fontFamily={FontFamily.regular} fill={colors.textSecondary} textAnchor="start">
              {fechaCorta(puntos[0].fecha)}
            </SvgText>
            {puntos.length > 1 ? (
              <SvgText x={x(puntos.length - 1)} y={alto - 4} fontSize={10} fontFamily={FontFamily.regular} fill={colors.textSecondary} textAnchor="end">
                {fechaCorta(puntos[puntos.length - 1].fecha)}
              </SvgText>
            ) : null}
          </Svg>
        ) : (
          <Text style={[Type.footnote, { color: colors.textSecondary }]}>
            Anota el peso de tus series para ver aquí cómo avanzas.
          </Text>
        )}

        <View style={styles.datos}>
          <Dato etiqueta={porTiempo ? 'Récord de tiempo' : 'Récord'} valor={record ? textoValor(record, m) : '–'} />
          {!porTiempo ? (
            <Dato
              etiqueta="Mejor serie"
              valor={mejorSerie ? `${formatoPeso(mejorSerie.peso)} kg × ${mejorSerie.repeticiones}` : '–'}
            />
          ) : null}
          <Dato etiqueta="Última vez" valor={ultimo ? textoValor(ultimo, m) : '–'} />
        </View>
      </Card>
    </View>
  );
}

function Dato({ etiqueta, valor: v }: { etiqueta: string; valor: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Text style={[Type.caption, { color: colors.textSecondary }]}>{etiqueta}</Text>
      <Text style={[Type.callout, { color: colors.text }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: Spacing.sm, paddingRight: Spacing.xl },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 7, maxWidth: 200 },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  medidas: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: Radius.sm },
  medida: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: Radius.sm - 2 },
  datos: { flexDirection: 'row', gap: Spacing.md },
});
