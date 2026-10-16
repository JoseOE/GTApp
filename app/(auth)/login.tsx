import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconCircle } from '@/components/ui/IconCircle';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, despertarServidor, loginRequest } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { saveSession } from '@/lib/session';

export default function LoginScreen() {
  const { colors, brand } = useTheme();
  const { establecer } = useAccount();
  // Al volver de "¿Olvidaste tu contraseña?" el correo ya viene escrito.
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lento, setLento] = useState(false);

  // Mientras escribes, se despierta al servidor (en Render se duerme si nadie
  // lo usa): así "Entrar" no carga también con el arranque.
  useEffect(() => {
    despertarServidor();
  }, []);

  // Si tarda, que se sepa por qué.
  useEffect(() => {
    if (!loading) {
      setLento(false);
      return;
    }
    const t = setTimeout(() => setLento(true), 4000);
    return () => clearTimeout(t);
  }, [loading]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Ingresa tu correo y tu contraseña.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const account = await loginRequest(email.trim(), password);
      await saveSession({ userId: account.id, nombre: account.nombre, token: account.token });
      // El login ya trae la cuenta completa (la misma de /me), con el color y
      // el logo del gimnasio: se usa tal cual, sin una segunda llamada.
      establecer(account);
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

            <AnimatedPressable
              onPress={() => router.push({ pathname: '/(auth)/recuperar', params: { email: email.trim() } })}
              haptic={false}
              scaleTo={0.97}
              hitSlop={8}
              style={styles.olvide}>
              <Text style={[styles.olvideTexto, { color: brand.primary }]}>¿Olvidaste tu contraseña?</Text>
            </AnimatedPressable>

            {error ? <ErrorBox message={error} /> : null}

            <PrimaryButton label="Entrar" icon="log-in-outline" onPress={handleLogin} loading={loading} />
            {lento ? (
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                Despertando el servidor… la primera vez del día puede tardar hasta un minuto.
              </Text>
            ) : null}

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
  olvide: { alignSelf: 'flex-end', marginTop: -Spacing.sm },
  olvideTexto: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  helper: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
});
