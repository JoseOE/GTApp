import { Linking } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';

import { API_BASE_URL, ApiError, authHeaders, request } from './api';

// Comprobantes y fichas de pago en PDF (GTWeb los genera con iText). Solo los
// ve quien compró: se piden con los encabezados de la sesión.

export const rutaReciboPdf = (orderId: string) => `/api/recibos/pedidos/${orderId}.pdf`;
export const rutaFichaPaynetPdf = (orderId: string) => `/api/recibos/paynet/${orderId}.pdf`;
export const rutaCodigoPaynet = (orderId: string) => `/api/recibos/paynet/${orderId}/codigo.png`;

// Baja el PDF al caché del teléfono (se reemplaza si ya estaba).
export async function descargarPdf(ruta: string, nombre: string): Promise<File> {
  try {
    return await File.downloadFileAsync(`${API_BASE_URL}${ruta}`, new File(Paths.cache, nombre), {
      headers: await authHeaders(),
      idempotent: true,
    });
  } catch {
    throw new ApiError('No se pudo descargar el PDF. Revisa tu conexión e inténtalo de nuevo.');
  }
}

// Menú de compartir del teléfono (WhatsApp, correo, Archivos, Drive...).
export async function compartirPdf(ruta: string, nombre: string, titulo: string) {
  const archivo = await descargarPdf(ruta, nombre);
  if (!(await Sharing.isAvailableAsync())) {
    throw new ApiError('Este dispositivo no permite compartir archivos.');
  }
  await Sharing.shareAsync(archivo.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: titulo });
}

export type EnlaceRecibo = { url: string; texto: string; venceEn: string };

// Enlace temporal (7 días) al comprobante o a la ficha, con el mensaje listo.
export function crearEnlace(orderId: string) {
  return request<EnlaceRecibo>(`/api/recibos/pedidos/${orderId}/enlace`, { method: 'POST' });
}

// Abre el PDF en el navegador del teléfono con el enlace temporal: el
// navegador no tiene la sesión de la app, el enlace sí sirve sin ella.
export async function verPdf(orderId: string) {
  const { url } = await crearEnlace(orderId);
  await WebBrowser.openBrowserAsync(url);
}

// Solo el enlace, por WhatsApp. Si WhatsApp no está instalado, wa.me lo
// ofrece en el navegador.
export async function compartirPorWhatsApp(orderId: string) {
  const { texto } = await crearEnlace(orderId);
  const mensaje = encodeURIComponent(texto);
  try {
    await Linking.openURL(`whatsapp://send?text=${mensaje}`);
  } catch {
    await Linking.openURL(`https://wa.me/?text=${mensaje}`);
  }
}

// Reenvía el comprobante (o la ficha, si falta pagar) al correo del miembro.
export function enviarPorCorreo(orderId: string) {
  return request<{ enviado: boolean; message: string }>(`/api/recibos/pedidos/${orderId}/enviar`, { method: 'POST' });
}
