import { request } from './api';
import type { Carrito } from './tienda';

// Renovar la membresía desde la puerta (RenovacionController en GTWeb).
// Cuando el lector niega la entrada porque la membresía venció, llega un push;
// si el socio paga desde la app mientras la alerta sigue vigente (10 minutos),
// la puerta se abre sola en cuanto se confirma el pago.

export type PlanRenovacion = {
  id: string;
  varianteId: string;
  nombre: string;
  precio: number;
  duracionTexto: string;
};

export type EstadoPuerta = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EXPIRADA';

export type PuertaRenovacion = {
  solicitudId: string;
  estado: EstadoPuerta;
  venceEn: string;
  abiertaPorRenovacion?: boolean;
  lector: string | null;
};

export type Renovacion = {
  vencida: boolean;
  // AAAA-MM-DD, o null si el gimnasio nunca le registró un pago.
  fechaProximoPago: string | null;
  planActual: string | null;
  // El sugerido (va preseleccionado) y todos los que se pueden elegir.
  plan: PlanRenovacion | null;
  planes: PlanRenovacion[];
  // La alerta de la puerta de los últimos 10 minutos, o null.
  puerta: PuertaRenovacion | null;
};

export function fetchRenovacion() {
  return request<Renovacion>('/api/tienda/renovacion');
}

// Deja el carrito de la app con ese plan solo (lo que tenía se quita) y lo
// devuelve, listo para el checkout de siempre.
//  - 409: el gimnasio no tiene planes a la venta en la app.
//  - 404: ese plan ya no está a la venta.
export function prepararRenovacion(planId: string) {
  return request<Renovacion & { carrito: Carrito }>('/api/tienda/renovacion?canal=app', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-11-05" → "5 de noviembre" (a mano: new Date con una fecha suelta la toma en UTC).
export function fechaVencimiento(iso: string | null): string | null {
  if (!iso) return null;
  const [, mes, dia] = iso.split('-').map(Number);
  return mes && dia ? `${dia} de ${MESES[mes - 1]}` : null;
}
