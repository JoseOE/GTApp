import { Alert } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

// Avisos y confirmaciones con el estilo de GymTrack, en lugar de la ventana
// genérica del sistema. Se llama igual que Alert.alert:
//
//   alerta('Cerrar sesión', '¿Quieres salir…?', [
//     { text: 'Cancelar', style: 'cancel' },
//     { text: 'Cerrar sesión', style: 'destructive', onPress: salir },
//   ], { icono: 'log-out-outline' });
//
// Lo dibuja <DialogoHost /> (components/ui/Dialogo.tsx), montado una sola vez
// en app/_layout.tsx. Si llegan varios a la vez, se muestran uno tras otro.

export type BotonDialogo = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
};

export type TonoDialogo = 'marca' | 'peligro' | 'exito' | 'aviso';

export type OpcionesDialogo = {
  icono?: keyof typeof Ionicons.glyphMap;
  tono?: TonoDialogo;
};

export type Dialogo = {
  id: number;
  titulo: string;
  mensaje?: string;
  botones: BotonDialogo[];
  icono: keyof typeof Ionicons.glyphMap;
  tono: TonoDialogo;
};

type Escucha = (cola: Dialogo[]) => void;

let cola: Dialogo[] = [];
let siguienteId = 1;
let escucha: Escucha | null = null;

const EXITO = /^(listo|enviado|referencia copiada|guardad)/i;
const ERROR = /^(no se pud|no se envi|error)/i;

// Tono e ícono por defecto según lo que dice el aviso.
function deducir(titulo: string, botones: BotonDialogo[]): Pick<Dialogo, 'icono' | 'tono'> {
  if (botones.some((b) => b.style === 'destructive')) return { tono: 'peligro', icono: 'alert-circle-outline' };
  if (EXITO.test(titulo)) return { tono: 'exito', icono: 'checkmark-circle-outline' };
  if (ERROR.test(titulo)) return { tono: 'aviso', icono: 'cloud-offline-outline' };
  return { tono: 'marca', icono: 'information-circle-outline' };
}

export function alerta(titulo: string, mensaje?: string, botones?: BotonDialogo[], opciones?: OpcionesDialogo) {
  const lista = botones?.length ? botones : [{ text: 'Entendido' }];
  // Sin el anfitrión montado (no debería pasar), al menos se avisa con la del sistema.
  if (!escucha) {
    Alert.alert(titulo, mensaje, lista);
    return;
  }
  const base = deducir(titulo, lista);
  cola = [
    ...cola,
    { id: siguienteId++, titulo, mensaje, botones: lista, icono: opciones?.icono ?? base.icono, tono: opciones?.tono ?? base.tono },
  ];
  escucha(cola);
}

// Solo para <DialogoHost />.
export function suscribirDialogos(fn: Escucha) {
  escucha = fn;
  fn(cola);
  return () => {
    if (escucha === fn) escucha = null;
  };
}

export function cerrarDialogo(id: number) {
  cola = cola.filter((d) => d.id !== id);
  escucha?.(cola);
}
