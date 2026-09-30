import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Por defecto la app habla con el backend publicado en Render. Para probar
// contra un backend local, define EXPO_PUBLIC_API_URL=local (usa el puerto
// 8080 de la máquina que corre Metro) o una URL completa.
const RENDER_API_URL = 'https://gtweb.onrender.com';

// En el emulador de Android, "localhost" apunta al propio emulador, no a la
// máquina que lo hospeda — hay que usar la IP del host de Metro (o, como
// respaldo, el alias especial 10.0.2.2) para llegar al backend local.
const API_PORT = 8080;

function resolveApiHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as unknown as { manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } } })
      .manifest2?.extra?.expoGo?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    if (host && host !== '0.0.0.0') return host;
  }
  if (Platform.OS === 'android') return '10.0.2.2';
  return 'localhost';
}

function resolveApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured === 'local') return `http://${resolveApiHost()}:${API_PORT}`;
  if (configured) return configured.replace(/\/+$/, '');
  return RENDER_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new ApiError(
      `No se pudo conectar con el servidor (${API_BASE_URL}). Verifica que el backend esté corriendo y que el dispositivo pueda alcanzarlo.`
    );
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(body?.error || `Error del servidor (${res.status}).`, res.status);
  }
  return body as T;
}

export type Role = 'owner' | 'member';
export type MembershipStatus = 'none' | 'pending' | 'active' | 'inactive';

export type Gym = {
  id: string;
  nombre: string;
  // El branding viaja siempre que haya gimnasio vinculado, incluso en pendiente
  // o dado de baja: esas pantallas también se pintan con los colores del gym.
  logo?: string | null;
  colorPrimario?: string | null;
  // El resto solo llega cuando la membresía está activa: el servidor recorta
  // la respuesta, así que un usuario dado de baja ni siquiera recibe los datos.
  telefono?: string;
  direccion?: string;
  horario?: string;
  equipamiento?: string;
  maquinas?: string[];
  cuotaMensual?: number | null;
  codigo?: string;
};

export type DirectoryGym = {
  id: string;
  nombre: string;
  direccion: string;
  horario: string;
  logo?: string | null;
  colorPrimario?: string | null;
};

export type Exercise = {
  id: string;
  nombre: string;
  musculo: string;
  series?: number | null;
  repeticiones?: string;
  instrucciones?: string;
};

export type Machine = {
  id: string;
  gymId: string;
  nombre: string;
  zona: string;
  descripcion?: string;
  cantidad?: number;
  ejercicios: Exercise[];
};

export type LoggedSet = {
  repeticiones: number | null;
  peso: number | null;
  completada: boolean;
};

export type LoggedExercise = {
  machineId?: string | null;
  machineNombre?: string | null;
  nombre: string;
  musculo: string;
  series: LoggedSet[];
};

export type WorkoutSession = {
  id: string;
  userId: string;
  gymId: string | null;
  nombre: string;
  fecha: string;
  duracionMinutos?: number | null;
  notas?: string | null;
  ejercicios: LoggedExercise[];
};

export type WorkoutStats = {
  totalSesiones: number;
  sesionesEsteMes: number;
  volumenSemana: number;
  seriesTotales: number;
  rachaDias: number;
  volumenPorMusculo: Record<string, number>;
  ultimoEntrenamiento: string | null;
};

// Forma única que devuelven /register, /login y /me.
export type Account = {
  id: string;
  nombre: string;
  email: string;
  role: Role;
  gymId: string | null;
  membershipStatus: MembershipStatus;
  membershipActive: boolean;
  hasGymAccess: boolean;
  // Cobranza: null mientras el gimnasio no le registre ningún pago.
  fechaProximoPago: string | null;
  diaDePago: number | null;
  diasParaVencer: number | null;
  gym: Gym | null;
};

export type Routine = {
  id: string;
  gymId: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  duracion: string;
  ejercicios: string[];
  dia?: string;
  coach?: string;
  nivel?: string;
};

export function loginRequest(email: string, password: string) {
  return request<Account>('/api/users/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

// Quien se registra desde la app siempre es "member": crea su cuenta primero y
// el gimnasio es opcional, se vincula después con un código.
export function registerRequest(nombre: string, email: string, password: string) {
  return request<Account>('/api/users/register', {
    method: 'POST',
    body: JSON.stringify({ nombre, email, password, role: 'member' }),
  });
}

// Estado vigente de la cuenta. Se llama al abrir cada pestaña, así que un alta o
// una baja hecha en el panel web se refleja sin cerrar sesión.
export function fetchAccount(userId: string) {
  return request<Account>(`/api/users/${userId}/me`);
}

export function lookupGym(codigo: string) {
  return request<{ id: string; nombre: string; direccion: string }>(
    `/api/gyms/lookup?codigo=${encodeURIComponent(codigo)}`
  );
}

export function joinGym(userId: string, codigo: string) {
  return request<{ message: string; gymNombre: string; membershipStatus: MembershipStatus }>(
    `/api/users/${userId}/membership/join`,
    { method: 'POST', body: JSON.stringify({ codigo }) }
  );
}

export function leaveGym(userId: string) {
  return request<{ message: string }>(`/api/users/${userId}/membership/leave`, { method: 'POST' });
}

// Rutinas que le corresponden al usuario. El servidor responde 403 si su
// membresía no está activa, en vez de confiar en que la app se autobloquee.
export function fetchMyRoutines(userId: string) {
  return request<Routine[]>(`/api/users/${userId}/routines`);
}

// Máquinas del gimnasio con sus ejercicios. Mismo corte del lado del servidor.
export function fetchMyMachines(userId: string) {
  return request<Machine[]>(`/api/users/${userId}/machines`);
}

export function fetchDirectory() {
  return request<DirectoryGym[]>('/api/gyms/directory');
}

// ─── Entrenamientos: siempre disponibles, con gimnasio o sin él ───
export function fetchWorkouts(userId: string) {
  return request<WorkoutSession[]>(`/api/users/${userId}/workouts`);
}

export function fetchWorkoutStats(userId: string) {
  return request<WorkoutStats>(`/api/users/${userId}/workouts/stats`);
}

export function saveWorkout(
  userId: string,
  workout: { nombre: string; duracionMinutos?: number; notas?: string; ejercicios: LoggedExercise[] }
) {
  return request<WorkoutSession>(`/api/users/${userId}/workouts`, {
    method: 'POST',
    body: JSON.stringify(workout),
  });
}

export function deleteWorkout(userId: string, workoutId: string) {
  return request<{ message: string }>(`/api/users/${userId}/workouts/${workoutId}`, { method: 'DELETE' });
}

// Token del teléfono para recibir avisos de aprobación y de vencimiento de pago.
export function registerPushToken(userId: string, pushToken: string) {
  return request<{ message: string }>(`/api/users/${userId}/push-token`, {
    method: 'PUT',
    body: JSON.stringify({ pushToken }),
  });
}
