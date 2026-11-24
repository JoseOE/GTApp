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
  // Cómo se hace: lo que capturó el gimnasio en la máquina, o el del catálogo libre.
  instrucciones?: string | null;
};

export type PlanRutina = {
  rutinaId: string | null;
  nombre: string;
  ejercicios: EjercicioPlan[];
};

export const DESCANSO_POR_DEFECTO = 90;
export const PASOS_PESO = [1, 2, 2.5, 5];
export const PASO_SEGUNDOS = 5;

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

function instruccionesLibres(nombre: string) {
  const clave = sinAcentos(nombre);
  return EJERCICIOS_LIBRES.find((x) => sinAcentos(x.nombre) === clave)?.instrucciones ?? null;
}

// Busca un ejercicio por nombre entre las máquinas del gimnasio y el catálogo libre.
function buscarPorNombre(nombre: string, machines: Machine[]) {
  const clave = sinAcentos(nombre);
  for (const m of machines) {
    const e = (m.ejercicios ?? []).find((x) => sinAcentos(x.nombre) === clave);
    if (e)
      return {
        nombre: e.nombre,
        musculo: e.musculo,
        machineId: m.id,
        machineNombre: m.nombre,
        instrucciones: e.instrucciones || instruccionesLibres(e.nombre),
      };
  }
  const libre = EJERCICIOS_LIBRES.find((x) => sinAcentos(x.nombre) === clave);
  return libre
    ? { nombre: libre.nombre, musculo: libre.musculo, machineId: null, machineNombre: null, instrucciones: libre.instrucciones }
    : null;
}

// Instrucciones de un ejercicio de máquina: por su máquina y su nombre.
function instruccionesDe(machineId: string | null | undefined, nombre: string, machines: Machine[]) {
  const clave = sinAcentos(nombre);
  const m = machines.find((x) => x.id === machineId);
  const e = m?.ejercicios?.find((x) => sinAcentos(x.nombre) === clave);
  return e?.instrucciones || instruccionesLibres(nombre);
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
        instrucciones: instruccionesDe(it.machineId, it.nombre, machines),
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
        instrucciones: hallado?.instrucciones ?? null,
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
  instrucciones?: string | null;
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
        instrucciones: e.instrucciones || instruccionesLibres(e.nombre),
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
    instrucciones: nuevo.instrucciones ?? instruccionesLibres(nuevo.nombre),
    reemplazaA: original.reemplazaA ?? original.nombre,
  };
}

// Segundos de un ejercicio por tiempo: "40 s", "30 s por lado", "20 min",
// "20-30 min", "40 s / 20 s descanso" (el primero). null si va por repeticiones.
export function segundosObjetivo(repeticiones: string): number | null {
  const m = /(\d+)(?:\s*-\s*\d+)?\s*(s|seg|segundos|min|minutos)\b/i.exec(repeticiones);
  if (!m) return null;
  const n = Number(m[1]);
  return /^min/i.test(m[2]) ? n * 60 : n;
}

export function esPorTiempo(e: { repeticiones: string }) {
  return segundosObjetivo(e.repeticiones) != null;
}

// Reps con las que se precarga cada serie: el primer número ("8-10" → 8).
// Lo que es por tiempo ("40 s") o "al fallo" se deja vacío.
export function repsObjetivo(repeticiones: string): number | null {
  if (segundosObjetivo(repeticiones) != null) return null;
  const m = /\d+/.exec(repeticiones);
  return m ? Number(m[0]) : null;
}

// ─── Sesión: el entrenamiento en curso ───

export type SerieEnCurso = {
  repeticiones: number | null;
  peso: number | null;
  segundos?: number | null;
  completada: boolean;
};
export type SerieAnterior = { repeticiones: number | null; peso: number | null; segundos: number | null };
export type EjercicioEnCurso = EjercicioPlan & {
  registro: SerieEnCurso[];
  // Lo que hizo la última vez en este ejercicio, serie por serie.
  anterior?: SerieAnterior[];
};

export type Mejor = { peso: number; volumenSerie: number; segundos?: number };

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
  // La última vez de cada ejercicio, para precargar y para cambiar a media rutina.
  anteriores?: Record<string, SerieAnterior[]>;
};

export function nuevaSesion(userId: string, plan: PlanRutina, historial: WorkoutSession[]): Sesion {
  const anteriores = ultimasSeries(historial);
  return {
    userId,
    rutinaId: plan.rutinaId,
    nombre: plan.nombre,
    inicio: Date.now(),
    ejercicios: plan.ejercicios.map((e) => enCurso(e, anteriores)),
    descanso: null,
    pasoPeso: 2.5,
    mejores: mejoresDelHistorial(historial),
    anteriores,
  };
}

// Cada serie se precarga con lo de la última vez (la misma serie, o la última
// que hizo si ahora hay más); si nunca lo hizo, con lo que pide la rutina.
export function enCurso(e: EjercicioPlan, anteriores: Record<string, SerieAnterior[]> = {}): EjercicioEnCurso {
  const reps = repsObjetivo(e.repeticiones);
  const seg = segundosObjetivo(e.repeticiones);
  const anterior = anteriores[claveEjercicio(e.nombre)];
  return {
    ...e,
    anterior,
    registro: Array.from({ length: Math.max(1, e.series) }, (_, s) => {
      const a = anterior?.length ? anterior[Math.min(s, anterior.length - 1)] : null;
      return {
        repeticiones: a?.repeticiones ?? reps,
        peso: a?.peso ?? null,
        segundos: seg != null ? a?.segundos ?? seg : null,
        completada: false,
      };
    }),
  };
}

export function claveEjercicio(nombre: string) {
  return sinAcentos(nombre);
}

const porFecha = (historial: WorkoutSession[]) =>
  [...historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

export function ultimasSeries(historial: WorkoutSession[]): Record<string, SerieAnterior[]> {
  const ultimas: Record<string, SerieAnterior[]> = {};
  for (const w of porFecha(historial)) {
    for (const e of w.ejercicios) {
      const k = claveEjercicio(e.nombre);
      if (ultimas[k]) continue;
      const hechas = e.series.filter((s) => s.completada);
      if (hechas.length)
        ultimas[k] = hechas.map((s) => ({ repeticiones: s.repeticiones, peso: s.peso, segundos: s.segundos ?? null }));
    }
  }
  return ultimas;
}

export function mejoresDelHistorial(historial: WorkoutSession[]): Record<string, Mejor> {
  const mejores: Record<string, Mejor> = {};
  for (const w of historial) {
    for (const e of w.ejercicios) {
      const k = claveEjercicio(e.nombre);
      const actual = (mejores[k] ??= { peso: 0, volumenSerie: 0, segundos: 0 });
      for (const s of e.series) {
        if (!s.completada) continue;
        actual.peso = Math.max(actual.peso, s.peso ?? 0);
        actual.volumenSerie = Math.max(actual.volumenSerie, (s.peso ?? 0) * (s.repeticiones ?? 0));
        actual.segundos = Math.max(actual.segundos ?? 0, s.segundos ?? 0);
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

// "60 kg × 8", "40 s", "× 12".
export function textoSerie(s: { repeticiones: number | null; peso: number | null; segundos?: number | null }) {
  if (s.segundos) return s.peso ? `${formatoPeso(s.peso)} kg · ${duracion(s.segundos)}` : duracion(s.segundos);
  if (s.peso) return `${formatoPeso(s.peso)} kg × ${s.repeticiones ?? '–'}`;
  return s.repeticiones != null ? `× ${s.repeticiones}` : '–';
}

// ─── Resumen ───

export type Record_ = { ejercicio: string; tipo: 'peso' | 'serie' | 'tiempo'; texto: string };

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
    series: e.registro.map((r) => ({
      repeticiones: r.repeticiones,
      peso: r.peso,
      segundos: r.segundos ?? null,
      completada: true,
    })),
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
    let maxSegundos = 0;
    let mejorSerie: SerieEnCurso | null = null;
    for (const r of e.registro) {
      if (!r.segundos) repeticiones += r.repeticiones ?? 0;
      const v = (r.peso ?? 0) * (r.repeticiones ?? 0);
      volumen += v;
      maxPeso = Math.max(maxPeso, r.peso ?? 0);
      maxSegundos = Math.max(maxSegundos, r.segundos ?? 0);
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
    if (maxSegundos > 0 && antes.segundos && maxSegundos > antes.segundos) {
      records.push({ ejercicio: e.nombre, tipo: 'tiempo', texto: `Más tiempo: ${duracion(maxSegundos)} (antes ${duracion(antes.segundos)})` });
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

// ─── Progreso por ejercicio ───

export type PuntoProgreso = {
  fecha: string;
  pesoMax: number;
  mejorSerie: { peso: number; repeticiones: number } | null;
  volumen: number;
  segundosMax: number;
  unoRM: number;
};

export type ProgresoEjercicio = { nombre: string; musculo: string; puntos: PuntoProgreso[] };

// Cada ejercicio con un punto por entrenamiento, del más viejo al más nuevo.
// El 1RM estimado usa la fórmula de Epley: peso × (1 + reps / 30).
export function progresoPorEjercicio(historial: WorkoutSession[]): ProgresoEjercicio[] {
  const mapa = new Map<string, ProgresoEjercicio>();
  for (const w of [...porFecha(historial)].reverse()) {
    for (const e of w.ejercicios) {
      const hechas = e.series.filter((s) => s.completada);
      if (!hechas.length) continue;
      const k = claveEjercicio(e.nombre);
      const p = mapa.get(k) ?? { nombre: e.nombre, musculo: e.musculo, puntos: [] };
      let mejor: PuntoProgreso['mejorSerie'] = null;
      let unoRM = 0;
      for (const s of hechas) {
        const peso = s.peso ?? 0;
        const reps = s.repeticiones ?? 0;
        if (peso && reps && (!mejor || peso * reps > mejor.peso * mejor.repeticiones)) mejor = { peso, repeticiones: reps };
        if (peso && reps) unoRM = Math.max(unoRM, peso * (1 + reps / 30));
      }
      p.puntos.push({
        fecha: w.fecha,
        pesoMax: Math.max(0, ...hechas.map((s) => s.peso ?? 0)),
        mejorSerie: mejor,
        volumen: hechas.reduce((t, s) => t + (s.peso ?? 0) * (s.repeticiones ?? 0), 0),
        segundosMax: Math.max(0, ...hechas.map((s) => s.segundos ?? 0)),
        unoRM: Math.round(unoRM * 10) / 10,
      });
      mapa.set(k, p);
    }
  }
  return [...mapa.values()].sort((a, b) => b.puntos.length - a.puntos.length);
}

// ─── Formatos ───

// 754 → "12:34"; 3725 → "1:02:05".
export function reloj(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

// 40 → "40 s"; 90 → "1:30 min"; 1200 → "20 min".
export function duracion(segundos: number) {
  if (segundos < 60) return `${segundos} s`;
  return segundos % 60 ? `${reloj(segundos)} min` : `${segundos / 60} min`;
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
