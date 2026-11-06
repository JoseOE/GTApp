import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Ionicons } from '@expo/vector-icons';

import { request } from './api';
import type { BadgeTone } from '@/components/ui/Badge';

// Anuncios que el gimnasio publica en su panel (pestaña Anuncios de GTWeb).
// La app solo recibe los vigentes del gimnasio del miembro activo.
export type TipoAnuncio = 'aviso' | 'promocion' | 'cierre';

export type Anuncio = {
  id: string;
  titulo: string;
  texto: string;
  tipo: TipoAnuncio;
  desde: string;
  hasta: string | null;
  creadoEn: string;
};

export const TIPO_ANUNCIO: Record<TipoAnuncio, { nombre: string; icono: keyof typeof Ionicons.glyphMap; tono: BadgeTone }> = {
  aviso: { nombre: 'Aviso', icono: 'information-circle', tono: 'info' },
  promocion: { nombre: 'Promoción', icono: 'pricetag', tono: 'success' },
  cierre: { nombre: 'Cierre', icono: 'calendar-clear', tono: 'warning' },
};

export function fetchAnuncios() {
  return request<Anuncio[]>('/api/anuncios');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "Hasta el 8 nov" (o nada si no vence). Fechas AAAA-MM-DD, armadas a mano.
export function vigenciaAnuncio(a: Anuncio): string | null {
  if (!a.hasta) return null;
  const [, m, d] = a.hasta.split('-').map(Number);
  return m && d ? `Hasta el ${d} ${MESES[m - 1]}` : null;
}

// Los que la persona ya cerró con "Entendido" en Inicio (por cuenta y teléfono).
// Siguen en la pantalla Anuncios mientras estén vigentes.
const clave = (userId: string) => `gymtrack.anuncios.vistos.${userId}`;

export async function anunciosVistos(userId: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(clave(userId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

// Solo se guardan los que siguen vigentes, para que la lista no crezca para siempre.
export async function marcarAnuncioVisto(userId: string, id: string, vigentes: string[]) {
  const vistos = await anunciosVistos(userId);
  vistos.add(id);
  const limpios = [...vistos].filter((v) => vigentes.includes(v));
  try {
    await AsyncStorage.setItem(clave(userId), JSON.stringify(limpios));
  } catch {
    // Sin almacenamiento: volverá a salir la próxima vez, no pasa nada.
  }
}
