import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Account } from './api';
import { getSession } from './session';

// La marca del gimnasio guardada en el teléfono: con ella la bienvenida sale
// al instante al abrir la app, sin esperar al servidor (en Render tarda
// segundos). La cuenta se pide igual por detrás y la marca se actualiza.
// Solo es el aspecto (nombre, logo, color, letra), nunca el acceso.
export type Marca = {
  nombre: string;
  logo: string | null;
  colorPrimario: string | null;
  tipografia: string | null;
};

const CLAVE = 'gymtrack.marca';

export function marcaDe(account: Account | null): Marca | null {
  const gym = account?.gym;
  if (!gym || account?.hasGymAccess !== true) return null;
  return {
    nombre: gym.nombre,
    logo: gym.logo ?? null,
    colorPrimario: gym.colorPrimario ?? null,
    tipografia: gym.tipografia ?? null,
  };
}

// Sin sesión no hay bienvenida: la marca guardada era de la cuenta anterior.
export async function leerMarca(): Promise<Marca | null> {
  try {
    if (!(await getSession())) return null;
    const raw = await AsyncStorage.getItem(CLAVE);
    return raw ? (JSON.parse(raw) as Marca) : null;
  } catch {
    return null;
  }
}

export async function guardarMarca(marca: Marca | null) {
  try {
    if (marca) await AsyncStorage.setItem(CLAVE, JSON.stringify(marca));
    else await AsyncStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: la próxima vez la bienvenida espera a la cuenta.
  }
}
