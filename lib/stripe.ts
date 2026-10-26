import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { crearSesionStripe } from './tienda';

// Enlaces a los que vuelve el navegador después de pagar en Stripe. En una
// build son gymtrack://pago-stripe; en Expo Go, exp://<host>/--/pago-stripe.
// Stripe solo regresa a direcciones https: GTWeb pasa por regreso-app.html,
// que reenvía aquí con el session_id.
export const regresoStripe = () => Linking.createURL('pago-stripe');
export const cancelStripe = () => Linking.createURL('pago-stripe-cancelado');

export type ResultadoStripe = { pagado: true; sesion: string } | { pagado: false };

// Abre la página de pago de Stripe por el total del carrito y espera a que el
// navegador vuelva a la app con la sesión pagada.
export async function pagarEnStripe(): Promise<ResultadoStripe> {
  const regreso = regresoStripe();
  const sesion = await crearSesionStripe(regreso, cancelStripe());
  // El de cancelado empieza igual que el de regreso, así que los dos cierran la sesión.
  const resultado = await WebBrowser.openAuthSessionAsync(sesion.url, regreso);
  if (resultado.type !== 'success' || resultado.url.includes('pago-stripe-cancelado')) return { pagado: false };
  const m = resultado.url.match(/[?&]session_id=([^&#]*)/);
  return m ? { pagado: true, sesion: decodeURIComponent(m[1]) } : { pagado: false };
}
