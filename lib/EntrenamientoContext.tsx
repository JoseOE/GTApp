import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAccount } from './AccountContext';
import { fetchWorkouts, saveWorkout } from './api';
import { hexToRgb } from './color';
import {
  enCurso,
  formatoPeso,
  nuevaSesion,
  paraGuardar,
  reemplazar,
  resumenDe,
  siguientePendiente,
  type Alternativa,
  type PlanRutina,
  type Resumen,
  type SerieEnCurso,
  type Sesion,
} from './entrenamiento';
import { cancelarFinDescanso, programarFinDescanso } from './notifications';
import {
  alAccionVivo,
  mostrarVivo,
  notificacionVivaDisponible,
  ocultarVivo,
  tomarAccionesVivo,
  type AccionVivo,
  type SeriePendiente,
} from '@/modules/entrenamiento-vivo';

// El entrenamiento en curso vive aquí, fuera de las pantallas: sigue corriendo
// si el usuario va a otra pestaña, y se guarda en el teléfono por si la app se
// cierra a la mitad.

const LLAVE = 'gymtrack.entrenamiento-activo';
const COLOR_GYMTRACK = '#f45124';

type Contexto = {
  sesion: Sesion | null;
  restaurando: boolean;
  resumen: Resumen | null;
  iniciar: (plan: PlanRutina) => Promise<void>;
  actualizarSerie: (e: number, s: number, cambios: Partial<SerieEnCurso>) => void;
  alternarSerie: (e: number, s: number) => void;
  agregarSerie: (e: number) => void;
  quitarSerie: (e: number, s: number) => void;
  cambiarEjercicio: (e: number, nuevo: Alternativa) => void;
  saltarDescanso: () => void;
  sumarDescanso: (segundos: number) => void;
  cambiarPaso: (paso: number) => void;
  terminar: () => Promise<Resumen>;
  descartar: () => void;
};

const EntrenamientoContext = createContext<Contexto | null>(null);

export function useEntrenamiento() {
  const ctx = useContext(EntrenamientoContext);
  if (!ctx) throw new Error('useEntrenamiento va dentro de EntrenamientoProvider');
  return ctx;
}

// Marca una serie como hecha. La siguiente del mismo ejercicio hereda el peso
// y las reps, y arranca el descanso (si hay más series por hacer).
function completar(sesion: Sesion, e: number, s: number, valores: Partial<SerieEnCurso>, cuando: number): Sesion {
  const ejercicios = sesion.ejercicios.map((ej, i) => {
    if (i !== e) return ej;
    const registro = ej.registro.map((r, j) => (j === s ? { ...r, ...valores, completada: true } : r));
    const hecha = registro[s];
    const sig = registro[s + 1];
    if (sig && !sig.completada) {
      registro[s + 1] = {
        ...sig,
        peso: sig.peso ?? hecha.peso,
        repeticiones: sig.repeticiones ?? hecha.repeticiones,
      };
    }
    return { ...ej, registro };
  });
  const siguiente = { ...sesion, ejercicios };
  const descanso = sesion.ejercicios[e]?.descansoSegundos ?? 0;
  const quedan = siguientePendiente(siguiente) != null;
  return {
    ...siguiente,
    descanso: descanso > 0 && quedan ? { hasta: cuando + descanso * 1000, total: descanso } : null,
  };
}

function aplicarAcciones(sesion: Sesion, acciones: AccionVivo[]): Sesion {
  let actual = sesion;
  for (const a of acciones) {
    const ej = actual.ejercicios[a.e];
    if (!ej || !ej.registro[a.s]) continue;
    if (a.tipo === 'hecha') {
      actual = completar(actual, a.e, a.s, { repeticiones: a.reps, peso: a.peso }, a.t);
    } else if (a.tipo === 'peso') {
      actual = {
        ...actual,
        ejercicios: actual.ejercicios.map((x, i) =>
          i === a.e ? { ...x, registro: x.registro.map((r, j) => (j === a.s ? { ...r, peso: a.peso } : r)) } : x
        ),
      };
    }
  }
  return actual;
}

function pendientes(sesion: Sesion): SeriePendiente[] {
  const lista: SeriePendiente[] = [];
  sesion.ejercicios.forEach((ej, e) => {
    ej.registro.forEach((r, s) => {
      if (r.completada) return;
      lista.push({
        e,
        s,
        nombre: ej.nombre,
        serie: `Serie ${s + 1} de ${ej.registro.length}`,
        reps: r.repeticiones,
        peso: r.peso,
        descanso: ej.descansoSegundos,
      });
    });
  });
  return lista;
}

export function EntrenamientoProvider({ children }: PropsWithChildren) {
  const { account } = useAccount();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [restaurando, setRestaurando] = useState(true);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const sesionRef = useRef<Sesion | null>(null);
  sesionRef.current = sesion;

  const colorGym = account?.gym?.colorPrimario && hexToRgb(account.gym.colorPrimario) ? account.gym.colorPrimario : COLOR_GYMTRACK;

  // Lo que se hizo desde la notificación mientras la app no miraba.
  const recogerAcciones = useCallback(() => {
    const acciones = tomarAccionesVivo();
    if (acciones.length) setSesion((s) => (s ? aplicarAcciones(s, acciones) : s));
  }, []);

  // Al abrir la app se recupera el entrenamiento que quedó a medias.
  useEffect(() => {
    AsyncStorage.getItem(LLAVE)
      .then((texto) => {
        if (texto) setSesion(aplicarAcciones(JSON.parse(texto) as Sesion, tomarAccionesVivo()));
      })
      .catch(() => {})
      .finally(() => setRestaurando(false));
  }, []);

  useEffect(() => {
    const quitarVivo = alAccionVivo(recogerAcciones);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recogerAcciones();
    });
    return () => {
      quitarVivo();
      sub.remove();
    };
  }, [recogerAcciones]);

  // El entrenamiento de otra cuenta que entró en este teléfono se descarta.
  useEffect(() => {
    if (!restaurando && account && sesion && sesion.userId !== account.id) setSesion(null);
  }, [restaurando, account, sesion]);

  // Cada cambio se guarda en el teléfono y se refleja en la notificación.
  useEffect(() => {
    if (restaurando) return;
    if (!sesion) {
      AsyncStorage.removeItem(LLAVE).catch(() => {});
      ocultarVivo();
      cancelarFinDescanso();
      return;
    }
    AsyncStorage.setItem(LLAVE, JSON.stringify(sesion)).catch(() => {});
    mostrarVivo({
      titulo: sesion.nombre,
      inicio: sesion.inicio,
      descansoHasta: sesion.descanso?.hasta ?? 0,
      paso: sesion.pasoPeso,
      color: colorGym,
      pendientes: pendientes(sesion),
    });
    // Sin la notificación fija (iPhone), el fin del descanso avisa con una normal.
    if (!notificacionVivaDisponible) {
      const sig = siguientePendiente(sesion);
      const ej = sig ? sesion.ejercicios[sig.e] : null;
      const r = sig && ej ? ej.registro[sig.s] : null;
      if (sesion.descanso && ej && sig && r) {
        const detalle = [r.peso ? `${formatoPeso(r.peso)} kg` : '', r.repeticiones ? `× ${r.repeticiones}` : '']
          .filter(Boolean)
          .join(' ');
        programarFinDescanso(sesion.descanso.hasta, `Sigue: ${ej.nombre} · Serie ${sig.s + 1} de ${ej.registro.length}${detalle ? ' · ' + detalle : ''}`);
      } else {
        cancelarFinDescanso();
      }
    }
  }, [sesion, restaurando, colorGym]);

  const modificar = useCallback((cambio: (s: Sesion) => Sesion) => {
    setSesion((s) => (s ? cambio(s) : s));
  }, []);

  const iniciar = useCallback(
    async (plan: PlanRutina) => {
      // El historial da los récords anteriores; si no carga, se entrena igual.
      if (!account) return;
      const historial = await fetchWorkouts(account.id).catch(() => []);
      setResumen(null);
      setSesion(nuevaSesion(account.id, plan, historial));
    },
    [account]
  );

  const actualizarSerie = useCallback(
    (e: number, s: number, cambios: Partial<SerieEnCurso>) =>
      modificar((ses) => ({
        ...ses,
        ejercicios: ses.ejercicios.map((x, i) =>
          i === e ? { ...x, registro: x.registro.map((r, j) => (j === s ? { ...r, ...cambios } : r)) } : x
        ),
      })),
    [modificar]
  );

  const alternarSerie = useCallback(
    (e: number, s: number) =>
      modificar((ses) => {
        const r = ses.ejercicios[e]?.registro[s];
        if (!r) return ses;
        if (!r.completada) return completar(ses, e, s, {}, Date.now());
        return {
          ...ses,
          ejercicios: ses.ejercicios.map((x, i) =>
            i === e ? { ...x, registro: x.registro.map((y, j) => (j === s ? { ...y, completada: false } : y)) } : x
          ),
        };
      }),
    [modificar]
  );

  const agregarSerie = useCallback(
    (e: number) =>
      modificar((ses) => ({
        ...ses,
        ejercicios: ses.ejercicios.map((x, i) => {
          if (i !== e) return x;
          const ultima = x.registro[x.registro.length - 1];
          return {
            ...x,
            registro: [...x.registro, { repeticiones: ultima?.repeticiones ?? null, peso: ultima?.peso ?? null, completada: false }],
          };
        }),
      })),
    [modificar]
  );

  const quitarSerie = useCallback(
    (e: number, s: number) =>
      modificar((ses) => ({
        ...ses,
        ejercicios: ses.ejercicios.map((x, i) =>
          i === e && x.registro.length > 1 ? { ...x, registro: x.registro.filter((_, j) => j !== s) } : x
        ),
      })),
    [modificar]
  );

  // Cambiar un ejercicio a media rutina: si ya llevaba series hechas, se
  // conservan los números; el nombre y la máquina pasan a ser los del nuevo.
  const cambiarEjercicio = useCallback(
    (e: number, nuevo: Alternativa) =>
      modificar((ses) => ({
        ...ses,
        ejercicios: ses.ejercicios.map((x, i) => {
          if (i !== e) return x;
          const cambiado = reemplazar(x, nuevo);
          const hechas = x.registro.some((r) => r.completada);
          return hechas ? { ...cambiado, registro: x.registro } : enCurso(cambiado);
        }),
      })),
    [modificar]
  );

  const saltarDescanso = useCallback(() => modificar((ses) => ({ ...ses, descanso: null })), [modificar]);

  const sumarDescanso = useCallback(
    (segundos: number) =>
      modificar((ses) => {
        if (!ses.descanso) return ses;
        const hasta = Math.max(Date.now(), ses.descanso.hasta + segundos * 1000);
        return { ...ses, descanso: { hasta, total: Math.max(0, ses.descanso.total + segundos) } };
      }),
    [modificar]
  );

  const cambiarPaso = useCallback((paso: number) => modificar((ses) => ({ ...ses, pasoPeso: paso })), [modificar]);

  // Guarda solo las series hechas y deja listo el resumen. Si falla la red, la
  // sesión sigue en curso para reintentar.
  const terminar = useCallback(async () => {
    const actual = sesionRef.current;
    if (!actual || !account) throw new Error('No hay entrenamiento en curso.');
    const fin = Date.now();
    const ejercicios = paraGuardar(actual);
    if (!ejercicios.length) throw new Error('Marca al menos una serie como hecha para guardar.');
    await saveWorkout(account.id, {
      nombre: actual.nombre,
      duracionMinutos: Math.max(1, Math.round((fin - actual.inicio) / 60000)),
      rutinaId: actual.rutinaId,
      ejercicios,
    });
    const r = resumenDe(actual, fin);
    setResumen(r);
    setSesion(null);
    return r;
  }, [account]);

  const descartar = useCallback(() => setSesion(null), []);

  return (
    <EntrenamientoContext.Provider
      value={{
        sesion,
        restaurando,
        resumen,
        iniciar,
        actualizarSerie,
        alternarSerie,
        agregarSerie,
        quitarSerie,
        cambiarEjercicio,
        saltarDescanso,
        sumarDescanso,
        cambiarPaso,
        terminar,
        descartar,
      }}>
      {children}
    </EntrenamientoContext.Provider>
  );
}
