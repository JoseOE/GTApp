// Fotos de los ejercicios libres (los que no necesitan máquina del gimnasio).
// Los de máquina ya traen sus fotos desde la página (catálogo de máquinas).
//
// Son las mismas de la página: free-exercise-db (dominio público, The
// Unlicense), servidas por jsDelivr y fijadas a un commit para que no cambien.
// Cada ejercicio tiene dos: la posición inicial (0) y la final (1).
// Sin foto a propósito (Burpees, jumping jacks, la apertura 90/90…): la base
// no los tiene y es mejor ninguna que una de otro ejercicio.

const COMMIT = 'f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5';
const BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`;

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
  // Los que solo aparecen en las rutinas de ejemplo (sin gimnasio).
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
};

function sinAcentos(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

const POR_CLAVE: Record<string, string> = Object.fromEntries(
  Object.entries(LIBRES).map(([nombre, id]) => [sinAcentos(nombre), id])
);

// Las dos fotos (inicio y final) de un ejercicio libre por su nombre, o null.
export function imagenesLibres(nombre: string): string[] | null {
  const id = POR_CLAVE[sinAcentos(nombre)];
  return id ? [`${BASE}${id}/0.jpg`, `${BASE}${id}/1.jpg`] : null;
}
