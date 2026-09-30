import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
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
import { GymSplash } from '@/components/GymSplash';
import { pedirPermiso, registrarParaPushRemoto, reprogramarRecordatorioDePago } from '@/lib/notifications';
import { hexToRgb } from '@/lib/color';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AccountProvider>
      <RootNavigator />
    </AccountProvider>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { account } = useAccount();
  const [bienvenidaVista, setBienvenidaVista] = useState(false);

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

  const theme = Colors[colorScheme ?? 'light'];
  // La bienvenida de marca solo aplica a quien ya es miembro con acceso.
  const mostrarBienvenida = !bienvenidaVista && !!gym && account?.hasGymAccess === true;

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
              headerStyle: { backgroundColor: theme.headerBackground },
              headerTitleStyle: { color: theme.headerText },
              headerTintColor: theme.headerText,
            }}
          />

          {/* Directorio de gimnasios */}
          <Stack.Screen
            name="gym-directory"
            options={{
              presentation: 'modal',
              title: 'Gimnasios',
              headerStyle: { backgroundColor: theme.headerBackground },
              headerTitleStyle: { color: theme.headerText },
              headerTintColor: theme.headerText,
            }}
          />

          {/* Equipo del gimnasio y sus ejercicios */}
          <Stack.Screen
            name="gym-machines"
            options={{
              presentation: 'modal',
              title: 'Equipo del gimnasio',
              headerStyle: { backgroundColor: theme.headerBackground },
              headerTitleStyle: { color: theme.headerText },
              headerTintColor: theme.headerText,
            }}
          />

          {/* Registrar un entrenamiento */}
          <Stack.Screen
            name="workout-log"
            options={{
              presentation: 'modal',
              title: 'Registrar entrenamiento',
              headerStyle: { backgroundColor: theme.headerBackground },
              headerTitleStyle: { color: theme.headerText },
              headerTintColor: theme.headerText,
            }}
          />

          {/* Página de error no encontrada */}
          <Stack.Screen name="+not-found" options={{ title: 'No encontrado' }} />
        </Stack>

        {mostrarBienvenida && gym ? (
          <GymSplash
            logo={gym.logo}
            nombre={gym.nombre}
            color={colorDelGym}
            onDone={() => setBienvenidaVista(true)}
          />
        ) : null}
      </View>
    </GymBrandContext.Provider>
  );
}
