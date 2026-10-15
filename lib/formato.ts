import { API_BASE_URL } from './api';

// "$1,234.50". Se arma a mano para no depender de Intl en el motor de JS.
export function dinero(monto: number | null | undefined): string {
  const valor = Math.round((monto ?? 0) * 100) / 100;
  const [enteros, centavos] = Math.abs(valor).toFixed(2).split('.');
  const conComas = enteros.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${valor < 0 ? '-' : ''}$${conComas}.${centavos}`;
}

// Las imágenes que sube el gimnasio llegan como URL completa, pero las viejas
// pueden venir como ruta del servidor ("/api/imagenes/...").
export function urlImagen(imagen: string | null | undefined): string | null {
  if (!imagen) return null;
  if (/^(https?:|data:|file:)/i.test(imagen)) return imagen;
  return `${API_BASE_URL}${imagen.startsWith('/') ? '' : '/'}${imagen}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Instant del servidor → "15 de octubre de 2026" (con hora si se pide).
export function fechaLarga(iso: string | number | null | undefined, conHora = false): string {
  if (iso == null) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const fecha = `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
  if (!conHora) return fecha;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${fecha}, ${hh}:${mm}`;
}
