import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { COLOR_ESTRELLA, Estrellas } from './Estrellas';
import { EditorResena } from './EditorResena';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { fechaLarga } from '@/lib/formato';
import { borrarResena, fetchResenas, type Resena, type ResenasProducto } from '@/lib/tienda';

// Reseñas del producto: resumen por estrellas, la propia (si compró) y las
// demás de 10 en 10. abrirEditor llega desde "Califica tu compra" en Mis pedidos.
export function Resenas({
  gymId,
  productoId,
  productoNombre,
  abrirEditor = false,
  onCambio,
}: {
  gymId: string;
  productoId: string;
  productoNombre: string;
  abrirEditor?: boolean;
  onCambio?: () => void;
}) {
  const { colors, brand } = useTheme();
  const [datos, setDatos] = useState<ResenasProducto | null>(null);
  const [pagina, setPagina] = useState(0);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [editor, setEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await fetchResenas(gymId, productoId, 0);
      setDatos(d);
      setPagina(0);
      setError(null);
      return d;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las reseñas.');
      return null;
    }
  }, [gymId, productoId]);

  useEffect(() => {
    cargar().then((d) => {
      if (abrirEditor && d?.mia.puede) setEditor(true);
    });
  }, [cargar, abrirEditor]);

  async function verMas() {
    if (!datos) return;
    setCargandoMas(true);
    try {
      const siguiente = await fetchResenas(gymId, productoId, pagina + 1);
      setDatos({ ...siguiente, resenas: [...datos.resenas, ...siguiente.resenas] });
      setPagina(pagina + 1);
    } catch (err) {
      Alert.alert('No se pudieron cargar', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setCargandoMas(false);
    }
  }

  function confirmarBorrar() {
    Alert.alert('Borrar tu reseña', 'Se quitará de la tienda. Podrás escribir otra después.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarResena(gymId, productoId);
            await cargar();
            onCambio?.();
          } catch (err) {
            Alert.alert('No se pudo borrar', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
          }
        },
      },
    ]);
  }

  if (error && !datos) {
    return <Text style={[styles.meta, { color: colors.textSecondary }]}>{error}</Text>;
  }
  if (!datos) return <ActivityIndicator color={brand.primary} />;

  const { calificacion, mia } = datos;
  const otras = datos.resenas.filter((r) => !r.propia);

  return (
    <View style={{ gap: Spacing.md }}>
      <Text style={[styles.seccion, { color: colors.text }]}>Reseñas</Text>

      {calificacion.total > 0 ? (
        <Card style={styles.resumen}>
          <View style={styles.promedioCaja}>
            <Text style={[styles.promedio, { color: colors.text }]}>{calificacion.promedio.toFixed(1)}</Text>
            <Estrellas promedio={calificacion.promedio} size={13} conNumero={false} />
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {calificacion.total} {calificacion.total === 1 ? 'reseña' : 'reseñas'}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            {[5, 4, 3, 2, 1].map((e) => {
              const cuantas = calificacion.porEstrellas[String(e)] ?? 0;
              const ancho = calificacion.total ? (cuantas / calificacion.total) * 100 : 0;
              return (
                <View key={e} style={styles.barraFila}>
                  <Text style={[styles.barraEtiqueta, { color: colors.textSecondary }]}>{e}</Text>
                  <Ionicons name="star" size={10} color={COLOR_ESTRELLA} />
                  <View style={[styles.barra, { backgroundColor: colors.border }]}>
                    <View style={[styles.barraLlena, { width: `${ancho}%` }]} />
                  </View>
                  <Text style={[styles.barraEtiqueta, { color: colors.textSecondary, minWidth: 18, textAlign: 'right' }]}>
                    {cuantas}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : (
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Nadie ha calificado este producto todavía.</Text>
      )}

      {mia.resena ? (
        <Card style={{ gap: Spacing.sm, borderColor: brand.primary }}>
          <View style={styles.miaEncabezado}>
            <Text style={[styles.miaTitulo, { color: colors.text }]}>Tu reseña</Text>
            {mia.resena.oculta ? <Badge label="Oculta por el gimnasio" tone="muted" /> : null}
          </View>
          <TarjetaResena resena={mia.resena} />
          <View style={styles.miaAcciones}>
            <AnimatedPressable onPress={() => setEditor(true)} haptic={false} style={styles.miaBoton}>
              <Ionicons name="create-outline" size={16} color={brand.primaryDark} />
              <Text style={[styles.miaBotonTexto, { color: brand.primaryDark }]}>Editar</Text>
            </AnimatedPressable>
            <AnimatedPressable onPress={confirmarBorrar} haptic={false} style={styles.miaBoton}>
              <Ionicons name="trash-outline" size={16} color={brand.danger} />
              <Text style={[styles.miaBotonTexto, { color: brand.danger }]}>Borrar</Text>
            </AnimatedPressable>
          </View>
        </Card>
      ) : mia.puede ? (
        <AnimatedPressable
          onPress={() => setEditor(true)}
          haptic={false}
          style={[styles.escribir, { borderColor: brand.primary }]}>
          <Ionicons name="star-outline" size={18} color={brand.primaryDark} />
          <Text style={[styles.escribirTexto, { color: brand.primaryDark }]}>Ya lo compraste: califícalo</Text>
        </AnimatedPressable>
      ) : null}

      {otras.map((r) => (
        <Card key={r.id} style={{ paddingVertical: Spacing.lg }}>
          <TarjetaResena resena={r} />
        </Card>
      ))}

      {datos.hayMas ? (
        <AnimatedPressable onPress={verMas} disabled={cargandoMas} haptic={false} style={styles.verMas}>
          {cargandoMas ? (
            <ActivityIndicator color={brand.primary} />
          ) : (
            <Text style={[styles.escribirTexto, { color: brand.primaryDark }]}>Ver más reseñas</Text>
          )}
        </AnimatedPressable>
      ) : null}

      <EditorResena
        visible={editor}
        gymId={gymId}
        productoId={productoId}
        productoNombre={productoNombre}
        actual={mia.resena}
        onCerrar={() => setEditor(false)}
        onGuardada={async () => {
          setEditor(false);
          await cargar();
          onCambio?.();
        }}
      />
    </View>
  );
}

function TarjetaResena({ resena }: { resena: Resena }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.resenaEncabezado}>
        <Text style={[styles.autor, { color: colors.text }]}>{resena.autor}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {fechaLarga(resena.fecha)}
          {resena.editada ? ' · editada' : ''}
        </Text>
      </View>
      <Estrellas promedio={resena.estrellas} size={13} conNumero={false} />
      {resena.comentario ? (
        <Text style={[styles.comentario, { color: colors.text }]}>{resena.comentario}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  meta: { fontSize: 12 },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  promedioCaja: { alignItems: 'center', gap: 2 },
  promedio: { fontFamily: FontFamily.extraBold, fontSize: 34, lineHeight: 40 },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barraEtiqueta: { fontSize: 11 },
  barra: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barraLlena: { height: '100%', backgroundColor: COLOR_ESTRELLA, borderRadius: 3 },
  miaEncabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  miaTitulo: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  miaAcciones: { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
  miaBoton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miaBotonTexto: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  escribir: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radius.pill,
    paddingVertical: 12,
  },
  escribirTexto: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  verMas: { alignSelf: 'center', padding: Spacing.sm },
  resenaEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.sm },
  autor: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  comentario: { fontSize: 13.5, lineHeight: 19 },
});
