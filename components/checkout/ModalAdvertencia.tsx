import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { LEYENDA_SUPLEMENTO, RECOMENDACIONES_SUPLEMENTO } from '@/components/tienda/AdvertenciaSanitaria';
import { Casilla } from './Casilla';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { urlTerminos } from '@/lib/tienda';

// Paso 1 al pagar, solo si el carrito trae suplementos marcados por el
// gimnasio: hay que leer la advertencia sanitaria y aceptarla para seguir.
export function ModalAdvertencia({
  visible,
  productos,
  gymId,
  onCancelar,
  onAceptar,
}: {
  visible: boolean;
  productos: string[];
  gymId: string;
  onCancelar: () => void;
  onAceptar: () => void;
}) {
  const { colors, brand } = useTheme();
  const [acepto, setAcepto] = useState(false);

  useEffect(() => {
    if (visible) setAcepto(false);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        <View style={[styles.caja, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={{ gap: Spacing.md }}>
            <View style={styles.titulo}>
              <Ionicons name="warning" size={22} color={brand.warning} />
              <Text style={[styles.tituloTexto, { color: colors.text }]}>Advertencia sanitaria</Text>
            </View>
            <Text style={[styles.texto, { color: colors.text }]}>Tu compra incluye suplementos alimenticios:</Text>
            {productos.map((p) => (
              <Text key={p} style={[styles.producto, { color: colors.text }]}>
                • {p}
              </Text>
            ))}
            <Text style={[styles.leyenda, { color: colors.text, borderColor: brand.warning }]}>{LEYENDA_SUPLEMENTO}</Text>
            {RECOMENDACIONES_SUPLEMENTO.map((r) => (
              <Text key={r} style={[styles.punto, { color: colors.textSecondary }]}>
                • {r}
              </Text>
            ))}
            <AnimatedPressable haptic={false} onPress={() => WebBrowser.openBrowserAsync(`${urlTerminos(gymId)}#suplementos`)}>
              <Text style={[styles.enlace, { color: brand.primaryDark }]}>Leer la advertencia completa</Text>
            </AnimatedPressable>
            <Casilla marcada={acepto} onCambio={setAcepto} etiqueta="Leí la advertencia sanitaria y la acepto">
              <Text style={[styles.casillaTexto, { color: colors.text }]}>Leí la advertencia sanitaria y la acepto</Text>
            </Casilla>
          </ScrollView>
          <View style={styles.botones}>
            <PrimaryButton label="Aceptar y continuar" onPress={onAceptar} disabled={!acepto} />
            <AnimatedPressable onPress={onCancelar} haptic={false} style={styles.cancelar}>
              <Text style={[styles.cancelarTexto, { color: colors.textSecondary }]}>Volver</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  caja: { borderRadius: Radius.xl, padding: Spacing.xl, maxHeight: '90%', gap: Spacing.lg },
  titulo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  tituloTexto: { fontFamily: FontFamily.bold, fontSize: 18 },
  texto: { fontSize: 13.5 },
  producto: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  leyenda: { fontFamily: FontFamily.semiBold, fontSize: 13, lineHeight: 18, borderLeftWidth: 3, paddingLeft: Spacing.md },
  punto: { fontSize: 12.5, lineHeight: 17 },
  enlace: { fontFamily: FontFamily.semiBold, fontSize: 13, textDecorationLine: 'underline' },
  casillaTexto: { fontFamily: FontFamily.semiBold, fontSize: 13.5, lineHeight: 20 },
  botones: { gap: Spacing.sm },
  cancelar: { alignSelf: 'center', padding: Spacing.sm },
  cancelarTexto: { fontFamily: FontFamily.medium, fontSize: 14 },
});
