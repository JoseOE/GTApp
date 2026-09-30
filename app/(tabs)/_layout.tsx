import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Spacing } from '@/constants/Theme';
import { AnimatedTabIcon } from '@/components/ui/AnimatedTabIcon';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useAccount } from '@/lib/AccountContext';
import { cancelarRecordatorios } from '@/lib/notifications';
import { getSession } from '@/lib/session';

export default function TabLayout() {
  const { colors } = useTheme();
  const { signOut } = useAccount();
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
        headerShown: true,
        headerStyle: { backgroundColor: colors.headerBackground },
        headerTitleStyle: { fontFamily: FontFamily.semiBold, fontSize: 17, color: colors.headerText },
        headerTintColor: colors.headerText,
        headerRight: () => (
          <AnimatedPressable
            onPress={async () => {
              // Los recordatorios locales son de este usuario: se van con él.
              await cancelarRecordatorios();
              await signOut();
              router.replace('/(auth)/login');
            }}
            hitSlop={10}
            style={{ paddingHorizontal: Spacing.lg }}>
            <Ionicons name="log-out-outline" size={22} color={colors.headerText} />
          </AnimatedPressable>
        ),
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
    </Tabs>
  );
}
