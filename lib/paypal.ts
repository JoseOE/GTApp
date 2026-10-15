import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { crearOrdenPaypal } from './tienda';

// Enlaces a los que vuelve el navegador después de PayPal. En una build son
// gymtrack://pago-paypal; en Expo Go, exp://<host>/--/pago-paypal.
export const regresoPaypal = () => Linking.createURL('pago-paypal');
export const cancelPaypal = () => Linking.createURL('pago-paypal-cancelado');

export type ResultadoPaypal = { aprobado: true; token: string; payerId: string } | { aprobado: false };

// Crea la orden, abre la página del simulador para aprobarla (con una cuenta
// de prueba, sin contraseña) y espera a que el navegador vuelva a la app.
export async function aprobarEnPaypal(recordar: boolean): Promise<ResultadoPaypal> {
  const regreso = regresoPaypal();
  const orden = await crearOrdenPaypal(regreso, cancelPaypal(), recordar);
  // El de cancelado empieza igual que el de regreso, así que los dos cierran la sesión.
  const resultado = await WebBrowser.openAuthSessionAsync(orden.aprobarUrl, regreso);
  if (resultado.type !== 'success' || resultado.url.includes('pago-paypal-cancelado')) return { aprobado: false };
  const token = parametro(resultado.url, 'token');
  const payerId = parametro(resultado.url, 'PayerID');
  if (!token || !payerId) return { aprobado: false };
  return { aprobado: true, token, payerId };
}

function parametro(url: string, nombre: string): string | null {
  const m = url.match(new RegExp(`[?&]${nombre}=([^&#]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}
