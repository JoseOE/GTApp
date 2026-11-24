import { CATALOGO_FOTOS } from './CatalogoFotos';

// Fotos de cómo se hace cada ejercicio (posición inicial y final).
//
// Son las mismas de la página: free-exercise-db (dominio público, The
// Unlicense), servidas por jsDelivr y fijadas a un commit para que no cambien.
// Cada ejercicio tiene dos: la posición inicial (0) y la final (1).
//
// Se buscan por nombre, porque los gimnasios escriben sus rutinas a mano
// ("Press banca", "Jalón al pecho"): primero el nombre exacto (catálogo de la
// página, ejercicios libres y los extra de aquí), luego un alias y por último
// un nombre parecido ("Curl femoral" → "Curl femoral acostado").
// Sin foto a propósito (Burpees, jumping jacks, la apertura 90/90…): la base
// no los tiene y es mejor ninguna que una de otro ejercicio.

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`;

// Ejercicios libres (sin máquina) y los de las rutinas de ejemplo.
const LIBRES: Record<string, string> = {
  Lagartijas: 'Pushups',
  'Lagartijas diamante': 'Push-Ups_-_Close_Triceps_Position',
  Dominadas: 'Pullups',
  'Remo invertido': 'Inverted_Row',
  'Sentadilla con peso corporal': 'Bodyweight_Squat',
  'Sentadilla búlgara': 'Split_Squat_with_Dumbbells',
  Zancadas: 'Bodyweight_Walking_Lunge',
  'Puente de glúteo': 'Butt_Lift_Bridge',
  'Elevación de talones': 'Rocking_Standing_Calf_Raise',
  'Fondos en paralelas': 'Dips_-_Triceps_Version',
  'Curl con mancuernas': 'Dumbbell_Bicep_Curl',
  'Press militar con mancuernas': 'Dumbbell_Shoulder_Press',
  'Elevaciones laterales': 'Side_Lateral_Raise',
  'Peso muerto con mancuernas': 'Stiff-Legged_Dumbbell_Deadlift',
  'Plancha frontal': 'Plank',
  'Plancha lateral': 'Side_Bridge',
  'Elevación de piernas': 'Flat_Bench_Lying_Leg_Raise',
  'Bicicleta abdominal': 'Air_Bike',
  Escaladores: 'Mountain_Climbers',
  'Salto de cuerda': 'Rope_Jumping',
  Carrera: 'Jogging_Treadmill',
  'Lagartijas clásicas': 'Pushups',
  'Lagartijas inclinadas': 'Incline_Push-Up',
  'Zancadas alternadas': 'Bodyweight_Walking_Lunge',
  'Puente de glúteo a una pierna': 'Single_Leg_Glute_Bridge',
  'Superman en el piso': 'Superman',
  'Dominadas asistidas o remo invertido': 'Band_Assisted_Pull-Up',
  'Face pull con banda': 'Face_Pull',
  'Dead bug': 'Dead_Bug',
  'Gato-camello': 'Cat_Stretch',
  'Estiramiento de isquiotibiales': 'Hamstring_Stretch',
  // Nombres que usan los gimnasios y no están en el catálogo de la página.
  'Press inclinado en Smith': 'Smith_Machine_Incline_Bench_Press',
  'Crunch en polea': 'Cable_Crunch',
  'Saltos al cajón': 'Front_Box_Jump',
  'Cuerdas de batalla': 'Battling_Ropes',
  'Ondas alternas': 'Battling_Ropes',
  'Remo en TRX': 'Suspended_Row',
};

// Otra forma de llamar a un ejercicio → el nombre con foto.
const ALIAS: Record<string, string> = {
  Sentadilla: 'Sentadilla trasera',
  Fondos: 'Fondos en paralelas',
  'Press banca': 'Press banca plano',
  'Jalón al pecho': 'Jalón agarre ancho',
  'Remo en polea baja': 'Remo bajo en estación',
  'Remo Pendlay': 'Remo con barra',
  'Extensión de piernas': 'Extensión a dos piernas',
  'Pantorrilla de pie': 'Elevación de talones de pie',
  Prensa: 'Prensa 45°',
  'Prensa a 45°': 'Prensa 45°',
  'Pájaros en pec deck': 'Pec deck inverso',
  'Caminata inclinada': 'Caminata en pendiente',
  'Remo de 500 m': 'Remo en remadora',
  Bici: 'Pedaleo continuo',
  'Intervalos en bici': 'Sprints en bici',
};

function clave(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Los libres van primero: si un nombre está en los dos, gana el libre.
const POR_CLAVE = new Map<string, string>();
for (const [nombre, id] of [...Object.entries(LIBRES), ...Object.entries(CATALOGO_FOTOS)]) {
  if (!POR_CLAVE.has(clave(nombre))) POR_CLAVE.set(clave(nombre), id);
}
const ALIAS_POR_CLAVE = new Map(Object.entries(ALIAS).map(([a, b]) => [clave(a), clave(b)]));
const CLAVES = [...POR_CLAVE.keys()];

function carpetaDe(nombre: string): string | null {
  const q = clave(nombre);
  if (!q) return null;
  const exacta = POR_CLAVE.get(q) ?? POR_CLAVE.get(ALIAS_POR_CLAVE.get(q) ?? '');
  if (exacta) return exacta;
  // "Curl femoral" → el más corto que empiece igual ("Curl femoral acostado").
  const parecido = CLAVES.filter((k) => k.startsWith(q + ' ')).sort((a, b) => a.length - b.length)[0];
  if (parecido) return POR_CLAVE.get(parecido) ?? null;
  // "Peso muerto convencional" → el más largo con el que empiece ("Peso muerto").
  const base = CLAVES.filter((k) => q.startsWith(k + ' ')).sort((a, b) => b.length - a.length)[0];
  return base ? POR_CLAVE.get(base) ?? null : null;
}

// Las dos fotos (inicio y final) de un ejercicio por su nombre, o null.
export function imagenesPorNombre(nombre: string): string[] | null {
  const id = carpetaDe(nombre);
  return id ? [`${BASE}${id}/0.jpg`, `${BASE}${id}/1.jpg`] : null;
}

// Nombre anterior, por compatibilidad.
export const imagenesLibres = imagenesPorNombre;
