import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'gymtrack.session';

// El token abre la cuenta: en el teléfono se guarda cifrado con SecureStore
// (Keychain en iOS, Keystore en Android), no en AsyncStorage, que es texto
// plano. La web no tiene SecureStore y sigue con AsyncStorage.
const CIFRADA = Platform.OS !== 'web';

async function leerGuardada(): Promise<string | null> {
  if (!CIFRADA) return AsyncStorage.getItem(KEY);
  const cifrada = await SecureStore.getItemAsync(KEY).catch(() => null);
  if (cifrada) return cifrada;
  // Sesión de una versión anterior de la app: se pasa a SecureStore y se
  // borra de AsyncStorage (si no se pudo pasar, se queda donde estaba).
  const anterior = await AsyncStorage.getItem(KEY);
  if (anterior) {
    const pasada = await SecureStore.setItemAsync(KEY, anterior).then(() => true, () => false);
    if (pasada) await AsyncStorage.removeItem(KEY);
  }
  return anterior;
}

async function guardar(valor: string) {
  if (!CIFRADA) return AsyncStorage.setItem(KEY, valor);
  await SecureStore.setItemAsync(KEY, valor);
}

async function borrarGuardada() {
  await AsyncStorage.removeItem(KEY);
  if (CIFRADA) await SecureStore.deleteItemAsync(KEY).catch(() => {});
}

// La sesión solo guarda QUIÉN eres y su token. El estado de la membresía
// (activa, pendiente, dada de baja) no se cachea a propósito: se pide al
// servidor en cada pantalla, porque el gimnasio puede cambiarlo en cualquier
// momento desde el panel web.
export type Session = {
  userId: string;
  nombre: string;
  // Lo entrega el login (o el registro) y viaja en cada llamada como
  // "Authorization: Bearer <token>".
  token: string;
};

// Copia en memoria: cada llamada a la API la necesita y leer el almacenamiento es lento.
let enMemoria: Session | null | undefined;

export async function saveSession(session: Session) {
  enMemoria = session;
  vencidaAvisada = false;
  await guardar(JSON.stringify(session));
}

export async function getSession(): Promise<Session | null> {
  if (enMemoria !== undefined) return enMemoria;
  const raw = await leerGuardada();
  enMemoria = leer(raw);
  return enMemoria;
}

// Una sesión de antes de los tokens no sirve: el servidor ya no confía en el
// puro id, así que se pide iniciar sesión otra vez.
function leer(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed?.userId || !parsed.token) return null;
    return { userId: parsed.userId, nombre: parsed.nombre ?? '', token: parsed.token };
  } catch {
    return null;
  }
}

export async function clearSession() {
  enMemoria = null;
  await borrarGuardada();
}

// ─── Sesión vencida ───
// La API avisa aquí cuando el servidor responde {sesionVencida: true}; la raíz
// de la app escucha para borrar la sesión y volver al login.
type Oyente = () => void;
const oyentes = new Set<Oyente>();
// Varias llamadas pueden fallar juntas con el mismo token: se avisa una vez.
let vencidaAvisada = false;

export function onSesionVencida(oyente: Oyente) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function avisarSesionVencida() {
  if (vencidaAvisada) return;
  vencidaAvisada = true;
  oyentes.forEach((o) => o());
}
