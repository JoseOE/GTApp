import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconCircle } from '@/components/ui/IconCircle';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, registerRequest } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { saveSession } from '@/lib/session';

export default function RegisterScreen() {
  const { colors, brand } = useTheme();
  const { reload } = useAccount();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Completa tu nombre, correo y contraseña.');
      return;
    }
    if (password.length < 6) {
      setError('Tu contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const account = await registerRequest(nombre.trim(), email.trim(), password);
      await saveSession({ userId: account.id, nombre: account.nombre });
      await reload();
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear tu cuenta.');
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
            <IconCircle name="person-add" tone="brand" size={60} />
            <Text style={[styles.title, { color: colors.text }]}>Crea tu cuenta</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Tu cuenta es tuya: funciona con o sin gimnasio, y tu progreso te acompaña si cambias de uno.
            </Text>
          </Reveal>

          <Reveal index={1} style={styles.form}>
            <Field
              label="Nombre completo"
              icon="person-outline"
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Juan Pérez"
              autoCapitalize="words"
            />

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
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword((v) => !v)}
            />

            {error ? <ErrorBox message={error} /> : null}

            <PrimaryButton
              label="Crear cuenta"
              icon="arrow-forward"
              onPress={handleRegister}
              loading={loading}
            />

            <View style={[styles.noteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={18} color={brand.primary} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                ¿Vas a un gimnasio? Después de crear tu cuenta podrás vincularlo con el código que te dan en
                recepción.
              </Text>
            </View>

            <AnimatedPressable
              onPress={() => router.back()}
              haptic={false}
              scaleTo={0.97}
              style={styles.linkRow}>
              <Text style={[styles.helper, { color: colors.textSecondary }]}>
                ¿Ya tienes cuenta?{' '}
                <Text style={{ color: brand.primary, fontFamily: FontFamily.semiBold }}>Inicia sesión</Text>
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
  header: { alignItems: 'center', marginBottom: Spacing.xxl, gap: Spacing.sm },
  title: { fontFamily: FontFamily.extraBold, fontSize: 26, marginTop: Spacing.sm },
  subtitle: { fontSize: 13.5, textAlign: 'center', maxWidth: 300, lineHeight: 19 },
  form: { gap: Spacing.lg },
  noteBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
  },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  linkRow: { paddingVertical: Spacing.sm },
  helper: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
});
