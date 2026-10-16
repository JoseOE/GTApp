import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { IconCircle } from '@/components/ui/IconCircle';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { CambioConCodigo } from '@/components/cuenta/CambioConCodigo';
import { FontFamily, Spacing } from '@/constants/Theme';

// ¿Olvidaste tu contraseña? Un código llega al correo y aquí mismo se escribe
// junto con la contraseña nueva; después se entra con ella.
export default function RecuperarScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();

  function volverAlLogin(email?: string) {
    router.replace({ pathname: '/(auth)/login', params: email ? { email } : {} });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AnimatedPressable
            onPress={() => (router.canGoBack() ? router.back() : volverAlLogin())}
            hitSlop={10}
            haptic={false}
            style={styles.atras}
            accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>

          <Reveal index={0} style={styles.header}>
            <IconCircle name="key" tone="brand" size={60} />
            <Text style={[styles.title, { color: colors.text }]}>¿Olvidaste tu contraseña?</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Te mandamos un código a tu correo para que crees una contraseña nueva aquí mismo.
            </Text>
          </Reveal>

          <Reveal index={1}>
            <CambioConCodigo
              emailInicial={params.email ?? ''}
              onListo={(email, mensaje) => {
                Alert.alert('Listo', `${mensaje} Ya puedes iniciar sesión.`);
                volverAlLogin(email);
              }}
            />
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xxl, justifyContent: 'center' },
  atras: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, padding: Spacing.sm, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: Spacing.xxl, gap: Spacing.sm },
  title: { fontFamily: FontFamily.bold, fontSize: 24, textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
});
