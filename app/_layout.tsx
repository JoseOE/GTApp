import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from '@expo-google-fonts/poppins';

import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { GymBrandContext } from '@/hooks/useTheme';
import { AccountProvider, useAccount } from '@/lib/AccountContext';
import { CarritoProvider } from '@/lib/CarritoContext';
import { GymSplash } from '@/components/GymSplash';
import { guardarMarca, leerMarca, marcaDe, type Marca } from '@/lib/marcaGuardada';
import {
  alRecibirNotificacion,
  alTocarNotificacion,
  pedirPermiso,
  registrarParaPushRemoto,
  reprogramarRecordatorioDePago,
} from '@/lib/notifications';
import { AvisoRenovacion } from '@/components/AvisoRenovacion';
import { hexToRgb } from '@/lib/color';
import { FUENTES_PORTADA } from '@/constants/Tipografias';
import { FontFamily } from '@/constants/Theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
    // Las letras que el gimnasio puede elegir para su nombre en la portada.
    ...FUENTES_PORTADA,
  });

  // La pantalla de carga nativa (logo de GymTrack) se quita en RootNavigator,
  // cuando ya se sabe qué bienvenida mostrar: así no queda un "cargando" en medio.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AccountProvider>
      <CarritoProvider>
        <RootNavigator />
      </CarritoProvider>
    </AccountProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { account, loading } = useAccount();
  const pathname = usePathname();
  const [bienvenidaVista, setBienvenidaVista] = useState(false);
  // La marca guardada en el teléfono (undefined = todavía leyéndola): con ella
  // la bienvenida sale al instante, sin esperar al servidor.
  const [marcaGuardada, setMarcaGuardada] = useState<Marca | null | undefined>(undefined);
  const [esperaVencida, setEsperaVencida] = useState(false);
  // La marca de la bienvenida se fija al empezar, para que no cambie a medias.
  const marcaBienvenida = useRef<Marca | null>(null);

  useEffect(() => {
    leerMarca().then(setMarcaGuardada);
    // Si el servidor tarda demasiado, se sigue sin bienvenida.
    const t = setTimeout(() => setEsperaVencida(true), 6000);
    return () => clearTimeout(t);
  }, []);

  // Cada vez que llega la cuenta, se guarda (o se borra) su marca para la próxima vez.
  useEffect(() => {
    if (!loading) guardarMarca(marcaDe(account));
  }, [account, loading]);

  // Se quita el logo de GymTrack en cuanto hay algo que mostrar: la marca
  // guardada, la cuenta ya cargada o, si tarda, a los 6 s.
  const puedeOcultarCarga = marcaGuardada !== undefined && (!!marcaGuardada || !loading || esperaVencida);
  useEffect(() => {
    if (puedeOcultarCarga) SplashScreen.hideAsync();
  }, [puedeOcultarCarga]);

  const gym = account?.gym ?? null;
  // Solo se acepta un hex válido: si el gimnasio guardó basura, se usa la marca.
  const colorDelGym = gym?.colorPrimario && hexToRgb(gym.colorPrimario) ? gym.colorPrimario : null;

  // Avisos: el recordatorio local se reprograma con cada cambio de cuenta, y el
  // token remoto se registra una vez que sabemos quién es el usuario.
  // Si el entorno no soporta notificaciones (web, Expo Go) todo esto no hace nada.
  useEffect(() => {
    if (!account) return;
    let cancelado = false;
    (async () => {
      const permitido = await pedirPermiso();
      if (!permitido || cancelado) return;
      await reprogramarRecordatorioDePago(account);
      await registrarParaPushRemoto(account.id);
    })();
    return () => {
      cancelado = true;
    };
  }, [account]);

  // Tocar una notificación (con la app abierta o cerrada) abre su pantalla:
  // la de un anuncio, la lista de anuncios; la de membresía vencida en la
  // puerta, Renovar membresía.
  // Si llega con la app abierta, la de membresía vencida sale como aviso
  // dentro de la app, con "Renovar ahora".
  const [avisoRenovar, setAvisoRenovar] = useState<{ titulo: string; texto: string } | null>(null);
  useEffect(() => {
    const quitar: (() => void)[] = [];
    let activo = true;
    const guardar = (q: () => void) => {
      if (activo) quitar.push(q);
      else q();
    };
    alTocarNotificacion((datos) => {
      if (datos.tipo === 'anuncio') router.push('/anuncios');
      if (datos.tipo === 'renovar_membresia') {
        setAvisoRenovar(null);
        router.push('/renovar-membresia');
      }
    }).then(guardar);
    alRecibirNotificacion(({ titulo, texto, datos }) => {
      if (datos.tipo === 'renovar_membresia') setAvisoRenovar({ titulo, texto });
    }).then(guardar);
    return () => {
      activo = false;
      quitar.forEach((q) => q());
    };
  }, []);

  const theme = Colors[colorScheme ?? 'light'];
  // Encabezado de las pantallas que se abren encima de las pestañas.
  // Encabezado de las pantallas que se abren encima de las pestañas: del color
  // del fondo, sin línea ni sombra, como las barras de iOS.
  const header = {
    headerStyle: { backgroundColor: theme.background },
    headerTitleStyle: { color: theme.text, fontFamily: FontFamily.semiBold, fontSize: 17 },
    headerTintColor: theme.text,
    headerShadowVisible: false,
  };
  // La bienvenida de marca solo aplica a quien ya es miembro con acceso.
  if (!bienvenidaVista && !marcaBienvenida.current) {
    marcaBienvenida.current = marcaDe(account) ?? (loading ? marcaGuardada ?? null : null);
  }
  const mostrarBienvenida = !bienvenidaVista && !!marcaBienvenida.current && puedeOcultarCarga;

  return (
    <GymBrandContext.Provider value={colorDelGym}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
          {/* Grupo de autenticación (Login y registro) */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* Grupo principal de pestañas */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Vincular un gimnasio con su código de acceso */}
          <Stack.Screen
            name="gym-join"
            options={{
              presentation: 'modal',
              title: 'Vincular gimnasio',
              ...header,
            }}
          />

          {/* Directorio de gimnasios */}
          <Stack.Screen
            name="gym-directory"
            options={{
              presentation: 'modal',
              title: 'Gimnasios',
              ...header,
            }}
          />

          {/* Equipo del gimnasio y sus ejercicios */}
          <Stack.Screen
            name="gym-machines"
            options={{
              presentation: 'modal',
              title: 'Equipo del gimnasio',
              ...header,
            }}
          />

          {/* Registrar un entrenamiento */}
          <Stack.Screen
            name="workout-log"
            options={{
              presentation: 'modal',
              title: 'Registrar entrenamiento',
              ...header,
            }}
          />

          {/* Tienda del gimnasio */}
          <Stack.Screen name="producto/[id]" options={{ title: 'Producto', ...header }} />
          <Stack.Screen name="carrito" options={{ title: 'Tu carrito', ...header }} />
          <Stack.Screen name="checkout" options={{ title: 'Pagar', ...header }} />
          <Stack.Screen name="pedidos" options={{ title: 'Mis pedidos', ...header }} />
          {/* A donde vuelve el navegador después de PayPal y de Stripe: se cierran solas. */}
          <Stack.Screen name="pago-paypal" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="pago-paypal-cancelado" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="pago-stripe" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="pago-stripe-cancelado" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="pedido/[orderId]" options={{ title: 'Pedido', ...header }} />

          {/* Mi gimnasio: la ficha completa (horario, contacto, equipo) */}
          <Stack.Screen name="mi-gimnasio" options={{ title: 'Mi gimnasio', ...header }} />
          <Stack.Screen name="anuncios" options={{ title: 'Anuncios', ...header }} />
          {/* Renovar desde la puerta: la abre el push de membresía vencida */}
          <Stack.Screen name="renovar-membresia" options={{ title: 'Renovar membresía', ...header }} />

          {/* Mi cuenta: datos, contraseña y cerrar sesión */}
          <Stack.Screen name="cuenta" options={{ title: 'Mi cuenta', ...header }} />
          <Stack.Screen name="cambiar-contrasena" options={{ title: 'Contraseña', ...header }} />
          <Stack.Screen name="opinion" options={{ title: 'Tu opinión', ...header }} />

          {/* Página de error no encontrada */}
          <Stack.Screen name="+not-found" options={{ title: 'No encontrado' }} />
        </Stack>

        {avisoRenovar ? (
          <AvisoRenovacion
            titulo={avisoRenovar.titulo}
            texto={avisoRenovar.texto}
            onCerrar={() => setAvisoRenovar(null)}
            onRenovar={() => {
              setAvisoRenovar(null);
              router.push('/renovar-membresia');
            }}
          />
        ) : null}

        {mostrarBienvenida && marcaBienvenida.current ? (
          <GymSplash
            marca={marcaBienvenida.current}
            listo={!loading}
            convertirEnPortada={pathname === '/'}
            onDone={() => setBienvenidaVista(true)}
          />
        ) : null}
      </View>
    </GymBrandContext.Provider>
  );
}
