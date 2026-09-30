import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';

import { registerPushToken, type Account } from './api';

// Dos capas de aviso, porque hacen falta las dos:
//
// 1. LOCALES (programadas en el teléfono): el recordatorio de "te quedan 5 días
//    para pagar". La fecha de corte ya la conoce la app, así que no necesita
//    servidor.
// 2. REMOTAS (push desde el servidor): "te aceptaron en el gimnasio", que la app
//    no puede predecir.
//
// IMPORTANTE: `expo-notifications` NO se puede importar arriba. En Expo Go para
// Android su módulo nativo ya no existe (SDK 53+), y el propio `import` lanza
// "Cannot find native module 'ExpoTopicSubscriptionModule'" antes de que la app
// dibuje nada. Por eso se carga bajo demanda y solo fuera de Expo Go: así la app
// corre igual en Expo Go, sin avisos, y los activa sola en un development build.

type ModuloNotificaciones = typeof import('expo-notifications');

const CANAL_ANDROID = 'gymtrack-avisos';
const ID_RECORDATORIO = 'recordatorio-pago';
const DIAS_DE_AVISO = 5;

// undefined = todavía no se intentó cargar; null = no disponible en este entorno.
let modulo: ModuloNotificaciones | null | undefined;

export function notificacionesDisponibles(): boolean {
  return Platform.OS !== 'web' && !isRunningInExpoGo();
}

async function cargar(): Promise<ModuloNotificaciones | null> {
  if (modulo !== undefined) return modulo;
  if (!notificacionesDisponibles()) {
    modulo = null;
    return null;
  }
  try {
    const cargado = await import('expo-notifications');
    cargado.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    modulo = cargado;
  } catch {
    // Entorno sin el módulo nativo: la app sigue funcionando sin avisos.
    modulo = null;
  }
  return modulo;
}

export async function pedirPermiso(): Promise<boolean> {
  const Notifications = await cargar();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_ANDROID, {
      name: 'Avisos de GymTrack',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted) return true;
  if (!actual.canAskAgain) return false;

  const pedido = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return pedido.granted;
}

// Registra el token de este teléfono en el servidor para los avisos remotos.
// En simulador o sin proyecto de EAS no puede funcionar: se ignora sin romper nada.
export async function registrarParaPushRemoto(userId: string): Promise<boolean> {
  const Notifications = await cargar();
  if (!Notifications) return false;

  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return false;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await registerPushToken(userId, token.data);
    return true;
  } catch {
    return false;
  }
}

// Reprograma el recordatorio local de pago a partir de la fecha de corte vigente.
// Se llama cada vez que cambia la cuenta, así que siempre refleja el último pago.
export async function reprogramarRecordatorioDePago(account: Account | null) {
  const Notifications = await cargar();
  if (!Notifications) return;

  await Notifications.cancelScheduledNotificationAsync(ID_RECORDATORIO).catch(() => {});

  if (!account?.fechaProximoPago || account.membershipStatus !== 'active') return;

  // El aviso sale 5 días antes del corte, a las 10 de la mañana.
  const corte = new Date(account.fechaProximoPago + 'T10:00:00');
  const aviso = new Date(corte);
  aviso.setDate(aviso.getDate() - DIAS_DE_AVISO);
  if (aviso.getTime() <= Date.now()) return;

  const nombreGym = account.gym?.nombre ?? 'tu gimnasio';
  await Notifications.scheduleNotificationAsync({
    identifier: ID_RECORDATORIO,
    content: {
      title: 'Tienes 5 días para pagar',
      body: `Tu mensualidad en ${nombreGym} vence el ${formatearFecha(account.fechaProximoPago)}.`,
      data: { tipo: 'recordatorio_pago' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: aviso,
    },
  });
}

export async function cancelarRecordatorios() {
  const Notifications = await cargar();
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

function formatearFecha(iso: string): string {
  const [, mes, dia] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${dia} de ${meses[mes - 1]}`;
}
