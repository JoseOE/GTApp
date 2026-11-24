import { Platform } from 'react-native';
import { NativeModule, requireOptionalNativeModule } from 'expo';

// Notificación fija de Android mientras entrenas (ver android/.../Vivo.kt).
// En iPhone, en la web y en Expo Go el módulo no existe: todo queda en no-op
// y la app usa una notificación normal para el fin del descanso.

export type SeriePendiente = {
  e: number;
  s: number;
  nombre: string;
  serie: string;
  reps: number | null;
  peso: number | null;
  descanso: number;
};

export type EstadoVivo = {
  titulo: string;
  inicio: number;
  descansoHasta: number;
  paso: number;
  color: string;
  pendientes: SeriePendiente[];
};

export type AccionVivo =
  | { tipo: 'hecha'; e: number; s: number; reps: number | null; peso: number | null; t: number }
  | { tipo: 'peso'; e: number; s: number; peso: number };

type Eventos = { onAccion: () => void };

declare class Modulo extends NativeModule<Eventos> {
  mostrar(estado: string): void;
  ocultar(): void;
  tomarAcciones(): string;
}

const modulo = Platform.OS === 'android' ? requireOptionalNativeModule<Modulo>('EntrenamientoVivo') : null;

export const notificacionVivaDisponible = modulo != null;

export function mostrarVivo(estado: EstadoVivo) {
  try {
    modulo?.mostrar(JSON.stringify(estado));
  } catch {
    // Sin permiso de notificaciones o sin contexto: se sigue sin ella.
  }
}

export function ocultarVivo() {
  try {
    modulo?.ocultar();
  } catch {}
}

export function tomarAccionesVivo(): AccionVivo[] {
  try {
    const texto = modulo?.tomarAcciones();
    return texto ? (JSON.parse(texto) as AccionVivo[]) : [];
  } catch {
    return [];
  }
}

export function alAccionVivo(manejar: () => void): () => void {
  if (!modulo) return () => {};
  const sub = modulo.addListener('onAccion', manejar);
  return () => sub.remove();
}
