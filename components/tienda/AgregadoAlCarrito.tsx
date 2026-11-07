import { useEffect } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { dinero, urlImagen } from '@/lib/formato';

export type Agregado = {
  nombre: string;
  detalle: string | null;
  cantidad: number;
  imagen: string | null;
  // Cómo quedó el carrito después de agregar.
  articulos: number;
  total: number;
};

// Hoja que sube desde abajo al agregar un producto: confirma qué entró, cómo
// quedó el carrito y ofrece ir a pagar o seguir viendo la tienda. Reemplaza
// la alerta del sistema, que no lleva los colores ni la letra de GymTrack.
export function AgregadoAlCarrito({
  agregado,
  onVerCarrito,
  onCerrar,
}: {
  agregado: Agregado | null;
  onVerCarrito: () => void;
  onCerrar: () => void;
}) {
  const { colors, brand } = useTheme();
  const insets = useSafeAreaInsets();
  const imagen = urlImagen(agregado?.imagen);

  // Un toque de vibración de "listo": es la confirmación de una acción importante.
  useEffect(() => {
    if (agregado) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [agregado]);

  return (
    <Modal visible={!!agregado} transparent animationType="slide" onRequestClose={onCerrar} statusBarTranslucent>
      <Pressable style={styles.fondo} onPress={onCerrar} accessibilityLabel="Cerrar" accessibilityRole="button">
        {/* Tocar la hoja no la cierra; tocar el fondo, sí. */}
        <Pressable
          style={[styles.hoja, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.xl }]}
          onPress={() => {}}
          accessibilityViewIsModal>
          <View style={[styles.asa, { backgroundColor: colors.border }]} />

          <View style={styles.titulo}>
            <View style={[styles.palomita, { backgroundColor: brand.success }]}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
            <Text style={[Type.title, { color: colors.text }]} accessibilityRole="header">
              Agregado al carrito
            </Text>
          </View>

          {agregado ? (
            <View style={[styles.producto, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={[styles.miniatura, { backgroundColor: colors.surfaceMuted }]}>
                {imagen ? (
                  <Image source={{ uri: imagen }} style={styles.miniaturaImg} />
                ) : (
                  <Ionicons name="cube-outline" size={24} color={colors.textSecondary} />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[Type.headline, { color: colors.text }]} numberOfLines={2}>
                  {agregado.nombre}
                </Text>
                <Text style={[Type.footnote, { color: colors.textSecondary }]}>
                  {[agregado.detalle, agregado.cantidad > 1 ? `${agregado.cantidad} piezas` : null].filter(Boolean).join(' · ') ||
                    '1 pieza'}
                </Text>
              </View>
            </View>
          ) : null}

          {agregado ? (
            <View style={styles.resumen}>
              <Text style={[Type.callout, { color: colors.textSecondary }]}>
                Tu carrito · {agregado.articulos} {agregado.articulos === 1 ? 'artículo' : 'artículos'}
              </Text>
              <Text style={[Type.headline, { color: colors.text }]}>{dinero(agregado.total)}</Text>
            </View>
          ) : null}

          <View style={{ gap: Spacing.sm }}>
            <PrimaryButton label="Ver carrito" icon="cart" onPress={onVerCarrito} />
            <PrimaryButton label="Seguir comprando" variant="outline" onPress={onCerrar} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  asa: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3 },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  palomita: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  producto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  miniatura: { width: 56, height: 56, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  miniaturaImg: { width: '100%', height: '100%' },
  resumen: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
