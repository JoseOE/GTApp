import { StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { API_BASE_URL } from '@/lib/api';

// Logos de las formas de pago que publica GTWeb en /img/pagos/<nombre>.svg.
export type Logo =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'paypal'
  | 'oxxo'
  | '7-eleven'
  | 'walmart'
  | 'bodega-aurrera'
  | 'farmacias-del-ahorro'
  | 'circle-k';

export const NOMBRE_LOGO: Record<Logo, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'American Express',
  paypal: 'PayPal',
  oxxo: 'OXXO',
  '7-eleven': '7-Eleven',
  walmart: 'Walmart',
  'bodega-aurrera': 'Bodega Aurrerá',
  'farmacias-del-ahorro': 'Farmacias del Ahorro',
  'circle-k': 'Circle K',
};

// Ancho de cada logo cuando mide 24 de alto (su viewBox).
const ANCHO: Record<Logo, number> = {
  visa: 64,
  mastercard: 44,
  amex: 44,
  paypal: 72,
  oxxo: 56,
  '7-eleven': 64,
  walmart: 72,
  'bodega-aurrera': 72,
  'farmacias-del-ahorro': 72,
  'circle-k': 64,
};

// Cada SVG trae su propio fondo con los colores de la marca.
export function LogoPago({ nombre, alto = 24 }: { nombre: Logo; alto?: number }) {
  return (
    <View
      style={[styles.marco, { height: alto, width: (alto * ANCHO[nombre]) / 24 }]}
      accessible
      accessibilityLabel={NOMBRE_LOGO[nombre]}>
      <SvgUri uri={`${API_BASE_URL}/img/pagos/${nombre}.svg`} width="100%" height="100%" />
    </View>
  );
}

export function FilaLogos({ logos, alto }: { logos: Logo[]; alto?: number }) {
  return (
    <View style={styles.fila}>
      {logos.map((l) => (
        <LogoPago key={l} nombre={l} alto={alto} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(20, 20, 25, 0.15)',
    overflow: 'hidden',
  },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
