import { useEffect, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, changePassword } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';

// La misma regla que revisa el servidor (PasswordUtil.esSegura en GTWeb).
function esSegura(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

// Cambiar la contraseña. Si la cuenta trae la contraseña temporal que dio
// recepción, esta pantalla no se puede saltar: sin cambiarla no se sigue.
export default function CambiarContrasenaScreen() {
  const { colors } = useTheme();
  const { account, reload } = useAccount();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const temporal = account?.contrasenaTemporal === true;

  // El botón "atrás" de Android tampoco la salta.
  useEffect(() => {
    if (!temporal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [temporal]);

  async function guardar() {
    if (!account) return;
    if (!actual || !nueva) {
      setError('Escribe tu contraseña actual y la nueva.');
      return;
    }
    if (!esSegura(nueva)) {
      setError('La contraseña debe tener al menos 8 caracteres, con una letra, un número y un símbolo.');
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (nueva === actual) {
      setError('La contraseña nueva debe ser distinta a la actual.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { message } = await changePassword(account.id, actual, nueva);
      await reload();
      Alert.alert('Listo', message);
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar tu contraseña.');
    } finally {
      setLoading(false);
    }
  }

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
                ? 'Entraste con la contraseña que te dieron en recepción. Por seguridad, cámbiala por una que solo tú conozcas.'
                : 'Las demás sesiones abiertas de tu cuenta se cerrarán; la de este teléfono sigue.'}
            </Text>
          </View>

          <Card style={{ gap: Spacing.lg }}>
            <Field
              label={temporal ? 'Contraseña de recepción' : 'Contraseña actual'}
              icon="lock-open-outline"
              value={actual}
              onChangeText={setActual}
              secureTextEntry={!ver}
              autoCapitalize="none"
            />
            <Field
              label="Contraseña nueva"
              icon="lock-closed-outline"
              value={nueva}
              onChangeText={setNueva}
              secureTextEntry={!ver}
              autoCapitalize="none"
              rightIcon={ver ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setVer((v) => !v)}
              hint="Al menos 8 caracteres, con una letra, un número y un símbolo."
            />
            <Field
              label="Confirma la contraseña nueva"
              icon="checkmark-done-outline"
              value={confirmar}
              onChangeText={setConfirmar}
              secureTextEntry={!ver}
              autoCapitalize="none"
            />
            {error ? <ErrorBox message={error} /> : null}
            <PrimaryButton label="Guardar contraseña" icon="save-outline" onPress={guardar} loading={loading} />
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
