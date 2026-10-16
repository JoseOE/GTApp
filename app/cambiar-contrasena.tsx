import { useEffect } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { CambioConCodigo } from '@/components/cuenta/CambioConCodigo';
import { FontFamily, Spacing } from '@/constants/Theme';
import { useAccount } from '@/lib/AccountContext';

// Cambiar la contraseña con un código que llega al correo de la cuenta. Si la
// cuenta trae la contraseña temporal de recepción (su nombre de usuario), esta
// pantalla no se puede saltar: sin cambiarla no se sigue.
export default function CambiarContrasenaScreen() {
  const { colors } = useTheme();
  const { account, reload } = useAccount();

  const temporal = account?.contrasenaTemporal === true;

  // El botón "atrás" de Android tampoco la salta.
  useEffect(() => {
    if (!temporal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [temporal]);

  if (!account) return <View style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* Con la temporal no hay botón de regresar ni gesto para cerrar. */}
      <Stack.Screen options={{ headerBackVisible: !temporal, gestureEnabled: !temporal }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <IconCircle name={temporal ? 'key' : 'lock-closed'} tone={temporal ? 'warning' : 'brand'} size={56} />
            <Text style={[styles.title, { color: colors.text }]}>
              {temporal ? 'Crea tu propia contraseña' : 'Cambiar contraseña'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {temporal
                ? 'Entraste con tu nombre de usuario, la contraseña temporal que te dio el gimnasio. Por seguridad, crea una que solo tú conozcas.'
                : 'Las demás sesiones abiertas de tu cuenta se cerrarán; la de este teléfono sigue.'}
            </Text>
          </View>

          <Card>
            <CambioConCodigo
              emailFijo={account.email}
              onListo={async (_email, mensaje) => {
                // Ya no es temporal: la cuenta se vuelve a pedir para quitar el aviso.
                await reload();
                Alert.alert('Listo', mensaje);
                if (router.canGoBack()) router.back();
                else router.replace('/(tabs)');
              }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.sm },
  title: { fontFamily: FontFamily.bold, fontSize: 20, textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { fontSize: 13.5, textAlign: 'center', lineHeight: 19, maxWidth: 320 },
});
