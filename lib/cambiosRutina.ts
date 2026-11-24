import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Alternativa, EjercicioPlan, PlanRutina } from './entrenamiento';
import { reemplazar } from './entrenamiento';

// "Tu versión" de una rutina: los ejercicios que el usuario cambió, guardados
// en el teléfono por usuario y rutina. Se guardan por la clave del ejercicio
// (lugar + nombre original): si el coach cambia ese ejercicio, el cambio viejo
// ya no se aplica.

type Cambios = Record<string, Alternativa>;

const llave = (userId: string, rutinaId: string) => `gymtrack.cambios-rutina.${userId}.${rutinaId}`;

export async function leerCambios(userId: string, rutinaId: string): Promise<Cambios> {
  try {
    const texto = await AsyncStorage.getItem(llave(userId, rutinaId));
    return texto ? (JSON.parse(texto) as Cambios) : {};
  } catch {
    return {};
  }
}

export async function guardarCambios(userId: string, plan: PlanRutina) {
  if (!plan.rutinaId) return;
  const cambios: Cambios = {};
  for (const e of plan.ejercicios) {
    if (!e.reemplazaA) continue;
    cambios[e.clave] = { nombre: e.nombre, musculo: e.musculo, machineId: e.machineId, machineNombre: e.machineNombre };
  }
  try {
    if (Object.keys(cambios).length) await AsyncStorage.setItem(llave(userId, plan.rutinaId), JSON.stringify(cambios));
    else await AsyncStorage.removeItem(llave(userId, plan.rutinaId));
  } catch {}
}

export function aplicarCambios(ejercicios: EjercicioPlan[], cambios: Cambios): EjercicioPlan[] {
  return ejercicios.map((e) => (cambios[e.clave] ? reemplazar(e, cambios[e.clave]) : e));
}
