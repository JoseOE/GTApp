import { CATALOGO_FOTOS, COMMIT_ILUSTRACIONES, CUADROS } from './CatalogoFotos';

// Cómo se hace cada ejercicio, en imágenes: un maniquí 3D en la posición
// inicial y la final (algunos traen un cuadro intermedio; las planchas y los
// estiramientos, uno solo).
//
// Son las mismas de la página: open-exercise-illustrations (CC0, dominio
// público), servidas por jsDelivr y fijadas a un commit para que no cambien.
//
// Se buscan por nombre, porque los gimnasios escriben sus rutinas a mano
// ("Press banca", "Jalón al pecho"): primero el nombre exacto (catálogo de la
// página y los de aquí), luego un alias y por último un nombre parecido
// ("Curl femoral" → "Curl femoral acostado"). Lo que la base no tiene se queda
// sin imagen: mejor ninguna que una de otro ejercicio.

const BASE = `https://cdn.jsdelivr.net/gh/hitmanrepo/open-exercise-illustrations@${COMMIT_ILUSTRACIONES}/images/`;

// Ejercicios sin máquina, los de las rutinas de ejemplo y nombres que usan
// los gimnasios fuera del catálogo de la página → su ilustración.
const PROPIOS: Record<string, string> = {
  Lagartijas: 'push-up',
  'Lagartijas clásicas': 'push-up',
  'Lagartijas diamante': 'diamond-push-up',
  'Lagartijas inclinadas': 'incline-push-up',
  Dominadas: 'pull-up',
  'Dominadas asistidas o remo invertido': 'inverted-row',
  'Remo invertido': 'inverted-row',
  'Remo con banda elástica': 'band-row',
  'Superman en el piso': 'superman',
  'Face pull con banda': 'face-pulls',
  'Plancha con retracción escapular': 'scap-push-ups',
  'Plancha con toque de hombro': 'plank-shoulder-tap',
  'Sentadilla con peso corporal': 'bodyweight-squat',
  'Sentadilla búlgara': 'bulgarian-split-squat',
  Zancadas: 'reverse-lunge',
  'Zancadas alternadas': 'reverse-lunge',
  'Puente de glúteo': 'glute-bridge',
  'Puente de glúteo a una pierna': 'single-leg-glute-bridge',
  'Elevación de talones': 'calf-raises',
  'Fondos en paralelas': 'dips',
  'Curl con mancuernas': 'biceps-curl',
  'Press militar con mancuernas': 'dumbbell-shoulder-press',
  'Elevaciones laterales': 'lateral-raises',
  'Peso muerto con mancuernas': 'dumbbell-deadlift',
  'Plancha frontal': 'plank',
  'Plancha lateral': 'side-plank',
  'Elevación de piernas': 'leg-raises',
  'Bicicleta abdominal': 'bicycle-crunch',
  'Dead bug': 'dead-bug',
  Escaladores: 'mountain-climbers',
  'Salto de cuerda': 'jump-rope',
  Carrera: 'treadmill-run',
  'Jumping jacks': 'jumping-jacks',
  'Rodillas al pecho': 'high-knees',
  Burpees: 'burpees',
  'Gato-camello': 'cat-cow',
  'Rotación torácica en el piso': 'thoracic-rotations',
  'Estiramiento de isquiotibiales': 'standing-hamstring-stretch',
  'Apertura de cadera 90/90': 'ninety-ninety-hip-stretch',
  'Estiramiento de pectoral en marco': 'doorway-chest-stretch',
  // Nombres que usan los gimnasios y no están en el catálogo de la página.
  'Press inclinado en Smith': 'smith-machine-incline-press',
  'Crunch en polea': 'cable-crunch',
  'Saltos al cajón': 'box-jump',
  'Cuerdas de batalla': 'battle-rope-double-waves',
  'Ondas alternas': 'battle-rope-double-waves',
  'Remo en TRX': 'suspension-row',
  'Sentadilla con TRX': 'suspension-assisted-squat',
  'Remo Pendlay': 'pendlay-row',
  'Combinaciones en saco': 'shadow-boxing',
};

// Otra forma de llamar a un ejercicio → el nombre que tiene ilustración.
const ALIAS: Record<string, string> = {
  Sentadilla: 'Sentadilla trasera',
  Fondos: 'Fondos en paralelas',
  'Press banca': 'Press banca plano',
  'Jalón al pecho': 'Jalón agarre ancho',
  'Remo en polea baja': 'Remo bajo en estación',
  'Extensión de piernas': 'Extensión a dos piernas',
  'Pantorrilla de pie': 'Elevación de talones de pie',
  Prensa: 'Prensa 45°',
  'Prensa a 45°': 'Prensa 45°',
  'Pájaros en pec deck': 'Pec deck inverso',
  'Caminata inclinada': 'Caminata en pendiente',
  'Remo de 500 m': 'Remo en remadora',
  Bici: 'Pedaleo continuo',
  'Intervalos en bici': 'Sprints en bici',
  Escaladora: 'Escaladora continua',
  'Hip thrust': 'Hip thrust en máquina',
  'Curl femoral': 'Curl femoral acostado',
};

function clave(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Los propios van primero: si un nombre está en los dos, gana el propio.
const POR_CLAVE = new Map<string, string>();
for (const [nombre, id] of [...Object.entries(PROPIOS), ...Object.entries(CATALOGO_FOTOS)]) {
  if (!POR_CLAVE.has(clave(nombre))) POR_CLAVE.set(clave(nombre), id);
}
const ALIAS_POR_CLAVE = new Map(Object.entries(ALIAS).map(([a, b]) => [clave(a), clave(b)]));
const CLAVES = [...POR_CLAVE.keys()];

function ilustracionDe(nombre: string): string | null {
  const q = clave(nombre);
  if (!q) return null;
  const exacta = POR_CLAVE.get(q) ?? POR_CLAVE.get(ALIAS_POR_CLAVE.get(q) ?? '');
  if (exacta) return exacta;
  // "Curl femoral" → el más corto que empiece igual ("Curl femoral sentado").
  const parecido = CLAVES.filter((k) => k.startsWith(q + ' ')).sort((a, b) => a.length - b.length)[0];
  if (parecido) return POR_CLAVE.get(parecido) ?? null;
  // "Peso muerto convencional" → el más largo con el que empiece ("Peso muerto").
  const base = CLAVES.filter((k) => q.startsWith(k + ' ')).sort((a, b) => b.length - a.length)[0];
  return base ? POR_CLAVE.get(base) ?? null : null;
}

// Las imágenes de un ejercicio por su nombre (de la primera a la última posición), o null.
export function imagenesPorNombre(nombre: string): string[] | null {
  const id = ilustracionDe(nombre);
  const cuadros = id ? CUADROS[id] : null;
  return cuadros?.length ? cuadros.map((c) => BASE + c) : null;
}

// Nombre anterior, por compatibilidad.
export const imagenesLibres = imagenesPorNombre;

// Las que se guardaron antes con fotos de personas reales (free-exercise-db).
export function esFotoAnterior(url: string) {
  return url.includes('free-exercise-db');
}
