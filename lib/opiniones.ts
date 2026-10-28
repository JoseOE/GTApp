import { request } from './api';

// Opinión sobre GymTrack (una por cuenta). Con 4 estrellas o más aparece en
// el carrusel de la página de inicio, con la foto del gimnasio.
export type Opinion = {
  id?: string;
  autor: string;
  rol: 'Dueño' | 'Miembro';
  estrellas: number;
  texto: string;
  fecha: string;
  gimnasio: { nombre: string; foto: string | null; logo: string | null; colorPrimario: string | null };
};

export const MIN_OPINION = 10;
export const MAX_OPINION = 300;

// null si todavía no opina (el servidor responde {}).
export async function fetchMiOpinion(): Promise<Opinion | null> {
  const o = await request<Partial<Opinion>>('/api/opiniones/mia');
  return o && o.texto ? (o as Opinion) : null;
}

export function guardarOpinion(estrellas: number, texto: string) {
  return request<Opinion>('/api/opiniones/mia', { method: 'PUT', body: JSON.stringify({ estrellas, texto }) });
}

export function borrarOpinion() {
  return request<{ message: string }>('/api/opiniones/mia', { method: 'DELETE' });
}
