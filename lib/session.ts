import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'gymtrack.session';

// La sesión solo guarda QUIÉN eres. El estado de la membresía (activa, pendiente,
// dada de baja) no se cachea a propósito: se pide al servidor en cada pantalla,
// porque el gimnasio puede cambiarlo en cualquier momento desde el panel web.
export type Session = {
  userId: string;
  nombre: string;
};

export async function saveSession(session: Session) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function getSession(): Promise<Session | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (!parsed?.userId) return null;
    return { userId: parsed.userId, nombre: parsed.nombre ?? '' };
  } catch {
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.removeItem(KEY);
}
