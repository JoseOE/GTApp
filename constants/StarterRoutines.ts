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
export const EJERCICIOS_LIBRES: { nombre: string; musculo: string; instrucciones?: string }[] = [
  {
    nombre: 'Lagartijas',
    musculo: 'Pecho',
    instrucciones: 'Manos un poco más abiertas que los hombros y el cuerpo en línea recta. Baja hasta casi tocar el piso con el pecho y empuja.',
  },
  {
    nombre: 'Lagartijas diamante',
    musculo: 'Brazo',
    instrucciones: 'Junta las manos bajo el pecho formando un rombo con los dedos. Baja con los codos pegados al cuerpo y empuja.',
  },
  {
    nombre: 'Dominadas',
    musculo: 'Espalda',
    instrucciones: 'Agarre un poco más abierto que los hombros. Sube hasta pasar la barbilla de la barra y baja hasta estirar los brazos.',
  },
  {
    nombre: 'Remo invertido',
    musculo: 'Espalda',
    instrucciones: 'Bajo una barra o mesa firme, cuerpo recto y talones en el piso. Jala el pecho hacia la barra juntando las escápulas.',
  },
  {
    nombre: 'Sentadilla con peso corporal',
    musculo: 'Pierna',
    instrucciones: 'Pies al ancho de hombros. Baja llevando la cadera atrás, con el pecho arriba, hasta que los muslos queden paralelos al piso.',
  },
  {
    nombre: 'Sentadilla búlgara',
    musculo: 'Pierna',
    instrucciones: 'Pie de atrás sobre un banco. Baja recto hasta que la rodilla de atrás casi toque el piso y sube con la pierna de adelante.',
  },
  {
    nombre: 'Zancadas',
    musculo: 'Pierna',
    instrucciones: 'Da un paso largo y baja hasta que ambas rodillas formen 90°. Regresa empujando con la pierna de adelante y alterna.',
  },
  {
    nombre: 'Puente de glúteo',
    musculo: 'Pierna',
    instrucciones: 'Boca arriba con las rodillas dobladas. Sube la cadera apretando los glúteos hasta alinear rodillas, cadera y hombros.',
  },
  {
    nombre: 'Elevación de talones',
    musculo: 'Pierna',
    instrucciones: 'De pie, en el borde de un escalón. Baja los talones lo más posible y sube hasta quedar de puntas.',
  },
  {
    nombre: 'Fondos en paralelas',
    musculo: 'Brazo',
    instrucciones: 'Brazos estirados sobre las barras. Baja hasta que los codos formen 90° y empuja sin encoger los hombros.',
  },
  {
    nombre: 'Curl con mancuernas',
    musculo: 'Brazo',
    instrucciones: 'Codos pegados al cuerpo y palmas al frente. Sube las mancuernas hacia los hombros y baja lento.',
  },
  {
    nombre: 'Press militar con mancuernas',
    musculo: 'Hombro',
    instrucciones: 'Mancuernas a la altura de los hombros. Empuja hacia arriba sin arquear la espalda y baja controlado.',
  },
  {
    nombre: 'Elevaciones laterales',
    musculo: 'Hombro',
    instrucciones: 'Brazos a los costados con los codos un poco doblados. Sube hasta la altura de los hombros y baja lento.',
  },
  {
    nombre: 'Peso muerto con mancuernas',
    musculo: 'Espalda',
    instrucciones: 'Espalda recta y rodillas un poco dobladas. Baja las mancuernas pegadas a las piernas llevando la cadera atrás y sube apretando glúteos.',
  },
  {
    nombre: 'Plancha frontal',
    musculo: 'Core',
    instrucciones: 'Antebrazos en el piso y cuerpo recto de cabeza a talones. Aprieta abdomen y glúteos sin dejar caer la cadera.',
  },
  {
    nombre: 'Plancha lateral',
    musculo: 'Core',
    instrucciones: 'De lado, sobre un antebrazo y con los pies juntos. Sube la cadera hasta alinear el cuerpo y sostén.',
  },
  {
    nombre: 'Elevación de piernas',
    musculo: 'Core',
    instrucciones: 'Boca arriba con la espalda baja pegada al piso. Sube las piernas estiradas hasta 90° y baja sin tocar el piso.',
  },
  {
    nombre: 'Bicicleta abdominal',
    musculo: 'Core',
    instrucciones: 'Boca arriba con las manos tras la cabeza. Lleva el codo hacia la rodilla contraria alternando, como pedaleando.',
  },
  {
    nombre: 'Burpees',
    musculo: 'Cardio',
    instrucciones: 'Baja a cuclillas, lleva los pies atrás a plancha, regresa y salta con los brazos arriba.',
  },
  {
    nombre: 'Escaladores',
    musculo: 'Cardio',
    instrucciones: 'En plancha alta, lleva las rodillas al pecho alternando rápido, sin subir la cadera.',
  },
  {
    nombre: 'Salto de cuerda',
    musculo: 'Cardio',
    instrucciones: 'Saltos cortos sobre la punta de los pies, girando la cuerda con las muñecas.',
  },
  {
    nombre: 'Carrera',
    musculo: 'Cardio',
    instrucciones: 'Ritmo en el que puedas hablar con frases cortas. Pisa debajo de la cadera, sin dar zancadas largas.',
  },
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
