// Rutinas que trae la app de fábrica. No dependen de ningún gimnasio ni del
// servidor: son las que puede usar alguien que acaba de instalar la app, que
// todavía no se une a un gimnasio, o al que dieron de baja de uno.
// Todas se pueden hacer en casa o con equipo mínimo.

export type StarterRoutine = {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  duracion: string;
  nivel: string;
  equipo: string;
  ejercicios: string[];
};

// Ejercicios que no dependen de ninguna máquina. Son los que puede registrar
// cualquiera, con o sin gimnasio, y complementan los del gimnasio al entrenar.
export const EJERCICIOS_LIBRES: { nombre: string; musculo: string }[] = [
  { nombre: 'Lagartijas', musculo: 'Pecho' },
  { nombre: 'Lagartijas diamante', musculo: 'Brazo' },
  { nombre: 'Dominadas', musculo: 'Espalda' },
  { nombre: 'Remo invertido', musculo: 'Espalda' },
  { nombre: 'Sentadilla con peso corporal', musculo: 'Pierna' },
  { nombre: 'Sentadilla búlgara', musculo: 'Pierna' },
  { nombre: 'Zancadas', musculo: 'Pierna' },
  { nombre: 'Puente de glúteo', musculo: 'Pierna' },
  { nombre: 'Elevación de talones', musculo: 'Pierna' },
  { nombre: 'Fondos en paralelas', musculo: 'Brazo' },
  { nombre: 'Curl con mancuernas', musculo: 'Brazo' },
  { nombre: 'Press militar con mancuernas', musculo: 'Hombro' },
  { nombre: 'Elevaciones laterales', musculo: 'Hombro' },
  { nombre: 'Peso muerto con mancuernas', musculo: 'Espalda' },
  { nombre: 'Plancha frontal', musculo: 'Core' },
  { nombre: 'Plancha lateral', musculo: 'Core' },
  { nombre: 'Elevación de piernas', musculo: 'Core' },
  { nombre: 'Bicicleta abdominal', musculo: 'Core' },
  { nombre: 'Burpees', musculo: 'Cardio' },
  { nombre: 'Escaladores', musculo: 'Cardio' },
  { nombre: 'Salto de cuerda', musculo: 'Cardio' },
  { nombre: 'Carrera', musculo: 'Cardio' },
];

export const STARTER_ROUTINES: StarterRoutine[] = [
  {
    id: 'starter-espalda',
    nombre: 'Espalda sin máquinas',
    categoria: 'Espalda',
    descripcion: 'Tracción y postura usando tu propio peso y una banda elástica.',
    duracion: '30 min',
    nivel: 'Principiante',
    equipo: 'Banda elástica',
    ejercicios: [
      'Remo con banda elástica — 4 x 12',
      'Superman en el piso — 3 x 15',
      'Dominadas asistidas o remo invertido — 4 x 8',
      'Face pull con banda — 3 x 15',
      'Plancha con retracción escapular — 3 x 30 s',
    ],
  },
  {
    id: 'starter-pecho',
    nombre: 'Pecho y empuje',
    categoria: 'Pecho',
    descripcion: 'Progresión de lagartijas para ganar fuerza de empuje en casa.',
    duracion: '25 min',
    nivel: 'Principiante',
    equipo: 'Sin equipo',
    ejercicios: [
      'Lagartijas inclinadas — 4 x 12',
      'Lagartijas clásicas — 4 x 10',
      'Lagartijas diamante — 3 x 8',
      'Aperturas con banda — 3 x 15',
      'Plancha con toque de hombro — 3 x 20',
    ],
  },
  {
    id: 'starter-pierna',
    nombre: 'Pierna completa',
    categoria: 'Pierna',
    descripcion: 'Cuádriceps, glúteo y femoral sin necesitar barra ni prensa.',
    duracion: '35 min',
    nivel: 'Intermedio',
    equipo: 'Sin equipo',
    ejercicios: [
      'Sentadilla con peso corporal — 4 x 20',
      'Zancadas alternadas — 4 x 12 por pierna',
      'Puente de glúteo a una pierna — 3 x 12',
      'Sentadilla búlgara — 3 x 10 por pierna',
      'Elevación de talones — 4 x 20',
    ],
  },
  {
    id: 'starter-core',
    nombre: 'Core en 15 minutos',
    categoria: 'Core',
    descripcion: 'Circuito corto de abdomen y zona media, ideal para días cortos.',
    duracion: '15 min',
    nivel: 'Principiante',
    equipo: 'Sin equipo',
    ejercicios: [
      'Plancha frontal — 3 x 40 s',
      'Plancha lateral — 3 x 30 s por lado',
      'Dead bug — 3 x 12',
      'Elevación de piernas — 3 x 15',
      'Bicicleta abdominal — 3 x 20',
    ],
  },
  {
    id: 'starter-cardio',
    nombre: 'Cardio HIIT en casa',
    categoria: 'Cardio',
    descripcion: 'Intervalos de alta intensidad sin salir ni usar caminadora.',
    duracion: '20 min',
    nivel: 'Intermedio',
    equipo: 'Sin equipo',
    ejercicios: [
      'Jumping jacks — 40 s / 20 s descanso',
      'Burpees — 40 s / 20 s descanso',
      'Rodillas al pecho — 40 s / 20 s descanso',
      'Escaladores — 40 s / 20 s descanso',
      'Repetir el circuito 4 veces',
    ],
  },
  {
    id: 'starter-movilidad',
    nombre: 'Movilidad y estiramiento',
    categoria: 'Movilidad',
    descripcion: 'Para días de descanso o después de entrenar fuerte.',
    duracion: '20 min',
    nivel: 'Principiante',
    equipo: 'Sin equipo',
    ejercicios: [
      'Gato-camello — 2 x 10',
      'Rotación torácica en el piso — 2 x 10 por lado',
      'Estiramiento de isquiotibiales — 3 x 40 s',
      'Apertura de cadera 90/90 — 3 x 40 s por lado',
      'Estiramiento de pectoral en marco — 3 x 30 s',
    ],
  },
];
