import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconCircle } from '@/components/ui/IconCircle';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, loginRequest } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { saveSession } from '@/lib/session';

export default function LoginScreen() {
  const { colors, brand } = useTheme();
  const { reload } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const account = await loginRequest(email.trim(), password);
      await saveSession({ userId: account.id, nombre: account.nombre });
      // Carga la cuenta antes de navegar para que el color y el logo del
      // gimnasio ya estén listos cuando aparezca la primera pantalla.
      await reload();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Reveal index={0} style={styles.header}>
            <IconCircle name="barbell" tone="brand" size={64} />
            <Text style={[styles.title, { color: colors.text }]}>
              Gym<Text style={{ color: brand.primary }}>Track</Text>
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Entrena, mide tu progreso y conecta con tu gimnasio
            </Text>
          </Reveal>

          <Reveal index={1} style={styles.form}>
            <Field
              label="Correo electrónico"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="ejemplo@correo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Contraseña"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />

            {error ? <ErrorBox message={error} /> : null}

            <PrimaryButton label="Entrar" icon="log-in-outline" onPress={handleLogin} loading={loading} />

            <AnimatedPressable
              onPress={() => router.push('/(auth)/register')}
              haptic={false}
              scaleTo={0.97}
              style={styles.linkRow}>
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                ¿No tienes cuenta?{' '}
                <Text style={{ color: brand.primary, fontFamily: FontFamily.semiBold }}>Créala aquí</Text>
              </Text>
            </AnimatedPressable>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xxl, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: Spacing.xxxl, gap: Spacing.sm },
  title: { fontFamily: FontFamily.extraBold, fontSize: 30, marginTop: Spacing.sm },
  subtitle: { fontSize: 14.5, textAlign: 'center', maxWidth: 260 },
  form: { gap: Spacing.lg },
  linkRow: { paddingVertical: Spacing.sm },
  helper: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
});
