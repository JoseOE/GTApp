import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Casilla } from './Casilla';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { dinero } from '@/lib/formato';
import { urlPrivacidad, urlTerminos, type Vendedor } from '@/lib/tienda';

// Paso 2 al pagar, obligatorio (LFPC art. 76 bis): el desglose, la forma de
// pago, quién vende y la casilla de los términos y el aviso de privacidad.
export function ModalConfirmar({
  visible,
  gymId,
  gymNombre,
  vendedor,
  totales,
  formaDePago,
  aviso,
  confirmarTexto = 'Confirmar y pagar',
  onCancelar,
  onConfirmar,
}: {
  visible: boolean;
  gymId: string;
  gymNombre: string;
  vendedor: Vendedor | null;
  totales: { subtotal: number; iva: number; total: number };
  formaDePago: string;
  // P. ej. "Los términos de compra cambiaron..." cuando el servidor pide aceptarlos otra vez.
  aviso?: string | null;
  confirmarTexto?: string;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const { colors, brand } = useTheme();
  const [acepto, setAcepto] = useState(false);

  useEffect(() => {
    if (visible) setAcepto(false);
  }, [visible]);

  const razon = vendedor?.razonSocial || vendedor?.nombre || gymNombre;
  const abrir = (url: string) => WebBrowser.openBrowserAsync(url);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancelar}>
      <View style={styles.fondo}>
        <View style={[styles.hoja, { backgroundColor: colors.surface }]}>
          <ScrollView contentContainerStyle={{ gap: Spacing.lg }}>
            <Text style={[styles.titulo, { color: colors.text }]}>¿Confirmas tu compra?</Text>
            {aviso ? <Text style={[styles.aviso, { color: brand.warning }]}>{aviso}</Text> : null}

            <View style={{ gap: Spacing.xs }}>
              <Fila etiqueta="Subtotal (sin IVA)" valor={dinero(totales.subtotal)} />
              <Fila etiqueta="IVA 16 %" valor={dinero(totales.iva)} />
              <Fila etiqueta="Total a pagar" valor={dinero(totales.total)} fuerte />
            </View>

            <Bloque titulo="Forma de pago">
              <Text style={[styles.valor, { color: colors.text }]}>{formaDePago}</Text>
            </Bloque>

            <Bloque titulo="Quién te vende">
              <Text style={[styles.valor, { color: colors.text }]}>{razon}</Text>
              {vendedor?.razonSocial && vendedor.nombre && vendedor.nombre !== vendedor.razonSocial ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>Nombre comercial: {vendedor.nombre}</Text>
              ) : null}
              {vendedor?.rfc ? <Text style={[styles.meta, { color: colors.textSecondary }]}>RFC: {vendedor.rfc}</Text> : null}
              {vendedor?.direccion ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{vendedor.direccion}</Text> : null}
              {vendedor?.correoContacto ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{vendedor.correoContacto}</Text>
              ) : null}
            </Bloque>

            <Casilla
              marcada={acepto}
              onCambio={setAcepto}
              etiqueta="Acepto los Términos y condiciones de compra y el Aviso de privacidad">
              <Text style={[styles.casilla, { color: colors.text }]}>
                Acepto los{' '}
                <Text style={[styles.enlace, { color: brand.primaryDark }]} onPress={() => abrir(urlTerminos(gymId))}>
                  Términos y condiciones de compra
                </Text>{' '}
                y el{' '}
                <Text style={[styles.enlace, { color: brand.primaryDark }]} onPress={() => abrir(urlPrivacidad(gymId))}>
                  Aviso de privacidad
                </Text>
                .
              </Text>
            </Casilla>
          </ScrollView>

          <View style={{ gap: Spacing.sm }}>
            <PrimaryButton label={confirmarTexto} icon="lock-closed-outline" onPress={onConfirmar} disabled={!acepto} />
            <AnimatedPressable onPress={onCancelar} haptic={false} style={styles.cancelar}>
              <Text style={[styles.cancelarTexto, { color: colors.textSecondary }]}>Revisar mi pedido</Text>
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bloque, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
      <Text style={[styles.bloqueTitulo, { color: colors.textSecondary }]}>{titulo.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Fila({ etiqueta, valor, fuerte }: { etiqueta: string; valor: string; fuerte?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <Text style={[fuerte ? styles.fuerte : styles.meta, { color: fuerte ? colors.text : colors.textSecondary }]}>{etiqueta}</Text>
      <Text style={[fuerte ? styles.fuerte : styles.valor, { color: colors.text }]}>{valor}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  hoja: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    maxHeight: '92%',
    gap: Spacing.lg,
  },
  titulo: { fontFamily: FontFamily.bold, fontSize: 20 },
  aviso: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  fila: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12.5, lineHeight: 17 },
  valor: { fontFamily: FontFamily.medium, fontSize: 13.5 },
  fuerte: { fontFamily: FontFamily.bold, fontSize: 17 },
  bloque: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: 2 },
  bloqueTitulo: { fontFamily: FontFamily.semiBold, fontSize: 11, letterSpacing: 0.5, marginBottom: 2 },
  casilla: { fontSize: 13.5, lineHeight: 20 },
  enlace: { fontFamily: FontFamily.semiBold, textDecorationLine: 'underline' },
  cancelar: { alignSelf: 'center', padding: Spacing.sm },
  cancelarTexto: { fontFamily: FontFamily.medium, fontSize: 14 },
});
