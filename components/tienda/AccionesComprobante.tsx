import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import {
  compartirPdf,
  compartirPorWhatsApp,
  enviarPorCorreo,
  rutaFichaPaynetPdf,
  rutaReciboPdf,
  verPdf,
} from '@/lib/recibos';
import type { Pedido } from '@/lib/tienda';

type Accion = 'ver' | 'compartir' | 'whatsapp' | 'correo';

// Comprobante del pedido pagado, o la ficha de pago si falta pagarla en tienda:
// verlo, compartir el PDF, mandar el enlace por WhatsApp o reenviarlo al correo.
export function AccionesComprobante({ pedido }: { pedido: Pedido }) {
  const { colors } = useTheme();
  const [ocupada, setOcupada] = useState<Accion | null>(null);

  const pagado = pedido.estado === 'pagado' || pedido.estado === 'reembolsado';
  const ficha = pedido.estado === 'pendiente_pago' && !!pedido.paynet;
  if (!pagado && !ficha) return null;

  const que = pagado ? 'comprobante' : 'ficha de pago';
  const ruta = pagado ? rutaReciboPdf(pedido.orderId) : rutaFichaPaynetPdf(pedido.orderId);
  const nombre = `${pagado ? 'comprobante' : 'ficha-pago'}-${pedido.folio}.pdf`;

  async function hacer(accion: Accion) {
    setOcupada(accion);
    try {
      if (accion === 'ver') await verPdf(pedido.orderId);
      if (accion === 'compartir') await compartirPdf(ruta, nombre, `Pedido #${pedido.folio}`);
      if (accion === 'whatsapp') await compartirPorWhatsApp(pedido.orderId);
      if (accion === 'correo') {
        const r = await enviarPorCorreo(pedido.orderId);
        Alert.alert(r.enviado ? 'Enviado' : 'No se envió', r.message);
      }
    } catch (err) {
      Alert.alert('No se pudo', err instanceof ApiError ? err.message : 'Inténtalo de nuevo.');
    } finally {
      setOcupada(null);
    }
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      <Text style={[styles.titulo, { color: colors.text }]}>{pagado ? 'Tu comprobante' : 'Tu ficha de pago'}</Text>
      <View style={styles.rejilla}>
        <Boton icon="document-text-outline" texto="Ver PDF" ocupada={ocupada === 'ver'} onPress={() => hacer('ver')} />
        <Boton icon="share-outline" texto="Compartir PDF" ocupada={ocupada === 'compartir'} onPress={() => hacer('compartir')} />
        <Boton icon="logo-whatsapp" texto="WhatsApp" ocupada={ocupada === 'whatsapp'} onPress={() => hacer('whatsapp')} />
        <Boton icon="mail-outline" texto="A mi correo" ocupada={ocupada === 'correo'} onPress={() => hacer('correo')} />
      </View>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        Por WhatsApp se manda un enlace a tu {que} que vence en 7 días.
      </Text>
    </Card>
  );
}

function Boton({
  icon,
  texto,
  ocupada,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  texto: string;
  ocupada: boolean;
  onPress: () => void;
}) {
  const { colors, brand } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={ocupada}
      haptic={false}
      scaleTo={0.95}
      style={[styles.boton, { borderColor: colors.border, backgroundColor: colors.surfaceMuted }]}>
      {ocupada ? <ActivityIndicator color={brand.primary} /> : <Ionicons name={icon} size={22} color={brand.primaryDark} />}
      <Text style={[styles.botonTexto, { color: colors.text }]}>{texto}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  titulo: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  boton: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  botonTexto: { fontFamily: FontFamily.medium, fontSize: 12.5 },
  meta: { fontSize: 11.5, lineHeight: 16 },
});
