import type { LoggedExercise, Machine, Routine, WorkoutSession } from './api';
import { EJERCICIOS_LIBRES, type StarterRoutine } from '@/constants/StarterRoutines';

// ─── Plan: lo que se va a hacer, antes de empezar ───

export type EjercicioPlan = {
  // Lugar del ejercicio en la rutina del coach ("0:Press banca plano"). Sirve
  // para recordar los cambios del usuario y no aplicarlos si el coach cambia
  // la rutina.
  clave: string;
  nombre: string;
  musculo: string;
  machineId: string | null;
  machineNombre: string | null;
  series: number;
  repeticiones: string;
  descansoSegundos: number;
  // Nombre del ejercicio de la rutina original, si el usuario lo cambió.
  reemplazaA: string | null;
};

export type PlanRutina = {
  rutinaId: string | null;
  nombre: string;
  ejercicios: EjercicioPlan[];
};

export const DESCANSO_POR_DEFECTO = 90;
export const PASOS_PESO = [1, 2, 2.5, 5];

const sinAcentos = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

export function mismoMusculo(a: string, b: string) {
  return sinAcentos(a) === sinAcentos(b);
}

// "Press banca plano — 4 x 10" → nombre, series y repeticiones.
export function leerEjercicioDeTexto(texto: string): { nombre: string; series: number | null; repeticiones: string } {
  const m = /^(.*?)\s*[—–-]\s*(\d+)\s*[x×]\s*(.+)$/i.exec(texto.trim());
  if (m) return { nombre: m[1].trim(), series: Number(m[2]), repeticiones: m[3].trim() };
  const [nombre, ...resto] = texto.split(/\s*[—–]\s*/);
  return { nombre: nombre.trim(), series: null, repeticiones: resto.join(' — ').trim() };
}

// Busca un ejercicio por nombre entre las máquinas del gimnasio y el catálogo libre.
function buscarPorNombre(nombre: string, machines: Machine[]) {
  const clave = sinAcentos(nombre);
  for (const m of machines) {
    const e = (m.ejercicios ?? []).find((x) => sinAcentos(x.nombre) === clave);
    if (e) return { nombre: e.nombre, musculo: e.musculo, machineId: m.id, machineNombre: m.nombre };
  }
  const libre = EJERCICIOS_LIBRES.find((x) => sinAcentos(x.nombre) === clave);
  return libre ? { nombre: libre.nombre, musculo: libre.musculo, machineId: null, machineNombre: null } : null;
}

// Convierte la rutina del gimnasio en un plan. Las nuevas traen sus ejercicios
// con músculo y descanso (items); las anteriores son texto, y el músculo se
// saca del ejercicio de la máquina con el mismo nombre o de la categoría.
export function planDeRutina(rutina: Routine, machines: Machine[]): PlanRutina {
  const items = rutina.items ?? [];
  const ejercicios: EjercicioPlan[] = items.length
    ? items.map((it, i) => ({
        clave: `${i}:${it.nombre}`,
        nombre: it.nombre,
        musculo: it.musculo || rutina.categoria || 'Otro',
        machineId: it.machineId ?? null,
        machineNombre: it.machineNombre ?? null,
        series: it.series ?? 3,
        repeticiones: it.repeticiones ?? '',
        descansoSegundos: it.descansoSegundos ?? DESCANSO_POR_DEFECTO,
        reemplazaA: null,
      }))
    : planDeTexto(rutina.ejercicios ?? [], rutina.categoria, machines);
  return { rutinaId: rutina.id, nombre: rutina.nombre, ejercicios };
}

export function planDeStarter(rutina: StarterRoutine): PlanRutina {
  return { rutinaId: rutina.id, nombre: rutina.nombre, ejercicios: planDeTexto(rutina.ejercicios, rutina.categoria, []) };
}

function planDeTexto(textos: string[], categoria: string, machines: Machine[]): EjercicioPlan[] {
  return textos
    .filter((t) => t.trim())
    .map((texto, i) => {
      const leido = leerEjercicioDeTexto(texto);
      const hallado = buscarPorNombre(leido.nombre, machines);
      return {
        clave: `${i}:${leido.nombre}`,
        nombre: hallado?.nombre ?? leido.nombre,
        musculo: hallado?.musculo ?? (categoria || 'Otro'),
        machineId: hallado?.machineId ?? null,
        machineNombre: hallado?.machineNombre ?? null,
        series: leido.series ?? 3,
        repeticiones: leido.repeticiones,
        descansoSegundos: DESCANSO_POR_DEFECTO,
        reemplazaA: null,
      };
    });
}

export type Alternativa = {
  nombre: string;
  musculo: string;
  machineId: string | null;
  machineNombre: string | null;
  series?: number | null;
  repeticiones?: string;
};

// Ejercicios que pueden reemplazar a otro: los del mismo músculo, primero los
// de las máquinas del gimnasio y luego los que no necesitan máquina.
export function alternativas(ejercicio: { nombre: string; musculo: string }, machines: Machine[]) {
  const todos: Alternativa[] = [
    ...machines.flatMap((m) =>
      (m.ejercicios ?? []).map((e) => ({
        nombre: e.nombre,
        musculo: e.musculo,
        machineId: m.id,
        machineNombre: m.nombre,
        series: e.series,
        repeticiones: e.repeticiones,
      }))
    ),
    ...EJERCICIOS_LIBRES.map((e) => ({ ...e, machineId: null, machineNombre: null })),
  ].filter((a) => sinAcentos(a.nombre) !== sinAcentos(ejercicio.nombre));
  return {
    mismoMusculo: todos.filter((a) => mismoMusculo(a.musculo, ejercicio.musculo)),
    otros: todos.filter((a) => !mismoMusculo(a.musculo, ejercicio.musculo)),
  };
}

// El reemplazo conserva las series, las repeticiones y el descanso que pidió el coach.
export function reemplazar(original: EjercicioPlan, nuevo: Alternativa): EjercicioPlan {
  return {
    ...original,
    nombre: nuevo.nombre,
    musculo: nuevo.musculo,
    machineId: nuevo.machineId,
    machineNombre: nuevo.machineNombre,
    reemplazaA: original.reemplazaA ?? original.nombre,
  };
}

// Reps con las que se precarga cada serie: el primer número ("8-10" → 8).
// Lo que es por tiempo ("40 s") o "al fallo" se deja vacío.
export function repsObjetivo(repeticiones: string): number | null {
  if (/\d\s*(s|seg|min)\b/i.test(repeticiones)) return null;
  const m = /\d+/.exec(repeticiones);
  return m ? Number(m[0]) : null;
}

// ─── Sesión: el entrenamiento en curso ───

export type SerieEnCurso = { repeticiones: number | null; peso: number | null; completada: boolean };
export type EjercicioEnCurso = EjercicioPlan & { registro: SerieEnCurso[] };

export type Mejor = { peso: number; volumenSerie: number };

export type Sesion = {
  // Dueño del entrenamiento: si otra cuenta entra en el teléfono, no lo ve.
  userId: string;
  rutinaId: string | null;
  nombre: string;
  inicio: number;
  ejercicios: EjercicioEnCurso[];
  descanso: { hasta: number; total: number } | null;
  pasoPeso: number;
  // Lo mejor que el usuario había hecho en cada ejercicio, para los récords.
  mejores: Record<string, Mejor>;
};

export function nuevaSesion(userId: string, plan: PlanRutina, historial: WorkoutSession[]): Sesion {
  return {
    userId,
    rutinaId: plan.rutinaId,
    nombre: plan.nombre,
    inicio: Date.now(),
    ejercicios: plan.ejercicios.map(enCurso),
    descanso: null,
    pasoPeso: 2.5,
    mejores: mejoresDelHistorial(historial),
  };
}

export function enCurso(e: EjercicioPlan): EjercicioEnCurso {
  const reps = repsObjetivo(e.repeticiones);
  return {
    ...e,
    registro: Array.from({ length: Math.max(1, e.series) }, () => ({ repeticiones: reps, peso: null, completada: false })),
  };
}

export function claveEjercicio(nombre: string) {
  return sinAcentos(nombre);
}

export function mejoresDelHistorial(historial: WorkoutSession[]): Record<string, Mejor> {
  const mejores: Record<string, Mejor> = {};
  for (const w of historial) {
    for (const e of w.ejercicios) {
      const k = claveEjercicio(e.nombre);
      const actual = (mejores[k] ??= { peso: 0, volumenSerie: 0 });
      for (const s of e.series) {
        if (!s.completada) continue;
        actual.peso = Math.max(actual.peso, s.peso ?? 0);
        actual.volumenSerie = Math.max(actual.volumenSerie, (s.peso ?? 0) * (s.repeticiones ?? 0));
      }
    }
  }
  return mejores;
}

// Siguiente serie por hacer, en orden.
export function siguientePendiente(s: Sesion): { e: number; s: number } | null {
  for (let i = 0; i < s.ejercicios.length; i++) {
    const j = s.ejercicios[i].registro.findIndex((r) => !r.completada);
    if (j >= 0) return { e: i, s: j };
  }
  return null;
}

// ─── Resumen ───

export type Record_ = { ejercicio: string; tipo: 'peso' | 'serie'; texto: string };

export type Resumen = {
  nombre: string;
  segundos: number;
  ejercicios: number;
  series: number;
  repeticiones: number;
  volumen: number;
  musculos: { musculo: string; series: number }[];
  records: Record_[];
  detalle: { nombre: string; series: SerieEnCurso[] }[];
};

export function seriesHechas(s: Sesion) {
  return s.ejercicios
    .map((e) => ({ ...e, registro: e.registro.filter((r) => r.completada) }))
    .filter((e) => e.registro.length > 0);
}

export function paraGuardar(s: Sesion): LoggedExercise[] {
  return seriesHechas(s).map((e) => ({
    machineId: e.machineId,
    machineNombre: e.machineNombre,
    nombre: e.nombre,
    musculo: e.musculo,
    series: e.registro.map((r) => ({ repeticiones: r.repeticiones, peso: r.peso, completada: true })),
  }));
}

const kg = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} kg`;

export function resumenDe(s: Sesion, fin: number): Resumen {
  const hechos = seriesHechas(s);
  const musculos: Record<string, number> = {};
  const records: Record_[] = [];
  let series = 0;
  let repeticiones = 0;
  let volumen = 0;
  for (const e of hechos) {
    musculos[e.musculo] = (musculos[e.musculo] ?? 0) + e.registro.length;
    series += e.registro.length;
    let maxPeso = 0;
    let mejorSerie: SerieEnCurso | null = null;
    for (const r of e.registro) {
      repeticiones += r.repeticiones ?? 0;
      const v = (r.peso ?? 0) * (r.repeticiones ?? 0);
      volumen += v;
      maxPeso = Math.max(maxPeso, r.peso ?? 0);
      if (!mejorSerie || v > (mejorSerie.peso ?? 0) * (mejorSerie.repeticiones ?? 0)) mejorSerie = r;
    }
    // Solo hay récord si ya lo habías hecho antes: la primera vez no cuenta.
    const antes = s.mejores[claveEjercicio(e.nombre)];
    if (!antes) continue;
    if (maxPeso > 0 && maxPeso > antes.peso) {
      records.push({ ejercicio: e.nombre, tipo: 'peso', texto: `Nuevo peso máximo: ${kg(maxPeso)} (antes ${kg(antes.peso)})` });
    }
    const vMejor = mejorSerie ? (mejorSerie.peso ?? 0) * (mejorSerie.repeticiones ?? 0) : 0;
    if (mejorSerie && vMejor > 0 && vMejor > antes.volumenSerie) {
      records.push({ ejercicio: e.nombre, tipo: 'serie', texto: `Mejor serie: ${kg(mejorSerie.peso ?? 0)} × ${mejorSerie.repeticiones}` });
    }
  }
  return {
    nombre: s.nombre,
    segundos: Math.max(0, Math.round((fin - s.inicio) / 1000)),
    ejercicios: hechos.length,
    series,
    repeticiones,
    volumen,
    musculos: Object.entries(musculos)
      .map(([musculo, n]) => ({ musculo, series: n }))
      .sort((a, b) => b.series - a.series),
    records,
    detalle: hechos.map((e) => ({ nombre: e.nombre, series: e.registro })),
  };
}

// 754 → "12:34"; 3725 → "1:02:05".
export function reloj(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function formatoPeso(n: number | null) {
  if (n == null) return '';
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

// 90 → "1 min 30 s"
export function textoDescanso(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}
