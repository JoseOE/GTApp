import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { IconCircle } from '@/components/ui/IconCircle';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError, recuperarContrasena } from '@/lib/api';

// El servidor deja pedir otro correo cada 60 segundos.
const ESPERA_REENVIO = 60;

// ¿Olvidaste tu contraseña? Se pide el enlace al correo; el enlace abre la
// página de GymTrack para crear una contraseña nueva y luego se entra aquí.
export default function RecuperarScreen() {
  const { colors, brand } = useTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviar() {
    const correo = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError('Escribe el correo con el que creaste tu cuenta.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await recuperarContrasena(correo);
      setEnviadoA(correo);
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el correo. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function volverAlLogin() {
    if (router.canGoBack()) router.back();
    else router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AnimatedPressable onPress={volverAlLogin} hitSlop={10} haptic={false} style={styles.atras} accessibilityLabel="Volver">
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </AnimatedPressable>

          <Reveal index={0} style={styles.header}>
            <IconCircle name={enviadoA ? 'mail-open' : 'key'} tone="brand" size={60} />
            <Text style={[styles.title, { color: colors.text }]}>
              {enviadoA ? 'Revisa tu correo' : '¿Olvidaste tu contraseña?'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {enviadoA
                ? `Si hay una cuenta con ${enviadoA}, te enviamos un enlace para crear una contraseña nueva.`
                : 'Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.'}
            </Text>
          </Reveal>

          {enviadoA ? (
            <Reveal index={1} style={styles.form}>
              <View style={[styles.pasos, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Paso n={1} texto="Abre el correo de GymTrack (revisa también spam o promociones)." />
                <Paso n={2} texto="Toca el enlace y crea tu contraseña nueva. Vence en 30 minutos." />
                <Paso n={3} texto="Regresa aquí e inicia sesión con tu contraseña nueva." />
              </View>
              <PrimaryButton label="Volver a iniciar sesión" icon="log-in-outline" onPress={volverAlLogin} />
              <AnimatedPressable
                onPress={enviar}
                disabled={espera > 0 || loading}
                haptic={false}
                style={styles.linkRow}>
                <Text style={[styles.helper, { color: espera > 0 ? colors.textSecondary : brand.primary }]}>
                  {espera > 0 ? `¿No llegó? Puedes pedir otro en ${espera} s` : '¿No llegó? Enviar otro correo'}
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  setEnviadoA(null);
                  setError(null);
                }}
                haptic={false}
                style={styles.linkRow}>
                <Text style={[styles.helper, { color: colors.textSecondary }]}>Usar otro correo</Text>
              </AnimatedPressable>
              {error ? <ErrorBox message={error} /> : null}
            </Reveal>
          ) : (
            <Reveal index={1} style={styles.form}>
              <Field
                label="Correo electrónico"
                icon="mail-outline"
                value={email}
                onChangeText={setEmail}
                placeholder="ejemplo@correo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={enviar}
              />
              {error ? <ErrorBox message={error} /> : null}
              <PrimaryButton label="Enviar enlace" icon="send-outline" onPress={enviar} loading={loading} />
            </Reveal>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Paso({ n, texto }: { n: number; texto: string }) {
  const { colors, brand } = useTheme();
  return (
    <View style={styles.paso}>
      <View style={[styles.pasoNumero, { backgroundColor: brand.primary + '1F' }]}>
        <Text style={[styles.pasoNumeroTexto, { color: brand.primary }]}>{n}</Text>
      </View>
      <Text style={[styles.pasoTexto, { color: colors.text }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.xxl, justifyContent: 'center' },
  atras: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, padding: Spacing.sm, zIndex: 1 },
  header: { alignItems: 'center', marginBottom: Spacing.xxl, gap: Spacing.sm },
  title: { fontFamily: FontFamily.bold, fontSize: 24, textAlign: 'center', marginTop: Spacing.sm },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
  form: { gap: Spacing.lg },
  pasos: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.md },
  paso: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
  pasoNumero: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pasoNumeroTexto: { fontFamily: FontFamily.bold, fontSize: 13 },
  pasoTexto: { flex: 1, fontSize: 13.5, lineHeight: 19 },
  linkRow: { paddingVertical: Spacing.xs, alignSelf: 'center' },
  helper: { fontSize: 13.5, textAlign: 'center', fontFamily: FontFamily.medium },
});
