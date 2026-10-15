import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

// A esta ruta vuelve el navegador después de aprobar (o cancelar) en PayPal.
// El checkout ya recibió el enlace por openAuthSessionAsync; aquí solo se
// cierra la pantalla para regresar a donde estaba.
export default function RegresoPaypal() {
  const { colors, brand } = useTheme();

  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/tienda');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator color={brand.primary} />
    </View>
  );
}
