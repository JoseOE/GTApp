import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily } from '@/constants/Theme';
import { AnimatedTabIcon } from '@/components/ui/AnimatedTabIcon';
import { useAccount } from '@/lib/AccountContext';
import { temporalPospuesta } from '@/lib/contrasena';
import { getSession } from '@/lib/session';

export default function TabLayout() {
  const { colors } = useTheme();
  const { account } = useAccount();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }
      setReady(true);
    });
  }, []);

  // Quien entró con la contraseña que le dio recepción tiene que cambiarla
  // antes de seguir, salvo que haya elegido "Más tarde" en esta sesión de la app.
  const temporal = ready && account?.contrasenaTemporal === true && !temporalPospuesta(account?.id);
  useEffect(() => {
    if (temporal) router.push('/cambiar-contrasena');
  }, [temporal]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarLabelStyle: { fontFamily: FontFamily.medium, fontSize: 11.5 },
        // Como en iOS: sin barra arriba. Cada pestaña lleva su título grande
        // (TituloGrande) con el acceso a Mi cuenta, e Inicio su portada.
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'list' : 'list-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Entrenar',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'barbell' : 'barbell-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon
              name={focused ? 'stats-chart' : 'stats-chart-outline'}
              color={color}
              focused={focused}
              size={22}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tienda"
        options={{
          title: 'Tienda',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon name={focused ? 'bag-handle' : 'bag-handle-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
