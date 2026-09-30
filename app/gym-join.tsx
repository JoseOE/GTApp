import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Reveal } from '@/components/ui/Reveal';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, joinGym, lookupGym } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { getSession } from '@/lib/session';

type Preview = { id: string; nombre: string; direccion: string };

export default function GymJoinScreen() {
  const { colors, brand } = useTheme();
  const { reload } = useAccount();
  const [codigo, setCodigo] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Paso 1: buscar el gimnasio para que el usuario confirme que es el correcto
  // antes de mandar la solicitud. Evita unirse al gimnasio equivocado por un typo.
  async function handleBuscar() {
    if (!codigo.trim()) {
      setError('Escribe el código que te dieron en tu gimnasio.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      setPreview(await lookupGym(codigo.trim()));
    } catch (err) {
      setPreview(null);
      setError(err instanceof ApiError ? err.message : 'No se pudo buscar el gimnasio.');
    } finally {
      setLoading(false);
    }
  }

  // Paso 2: enviar la solicitud. Queda pendiente hasta que el gimnasio la apruebe.
  async function handleUnirse() {
    const session = await getSession();
    if (!session) return;
    setError(null);
    setLoading(true);
    try {
      await joinGym(session.userId, codigo.trim());
      // El estado de la cuenta cambió a "pendiente": hay que releerlo antes de
      // volver, o la pantalla anterior seguiría mostrando "sin gimnasio".
      await reload();
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar tu solicitud.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Reveal index={0} style={styles.header}>
            <IconCircle name="key" tone="brand" size={56} />
            <Text style={[styles.title, { color: colors.text }]}>Vincula tu gimnasio</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Pide el código de acceso en recepción. Al enviarlo, tu gimnasio recibe tu solicitud y la aprueba.
            </Text>
          </Reveal>

          <Reveal index={1} style={styles.form}>
            <Field
              label="Código de acceso"
              icon="keypad-outline"
              value={codigo}
              onChangeText={(text) => {
                setCodigo(text.toUpperCase());
                setPreview(null);
              }}
              placeholder="PWR4-K7M2"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              hint="No importa si lo escribes en minúsculas o sin el guion."
            />

            {error ? <ErrorBox message={error} /> : null}

            {preview ? (
              <Card style={styles.previewCard}>
                <View style={styles.previewRow}>
                  <IconCircle name="business" tone="success" size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.previewName, { color: colors.text }]}>{preview.nombre}</Text>
                    {preview.direccion ? (
                      <Text style={[styles.previewMeta, { color: colors.textSecondary }]}>
                        {preview.direccion}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.previewConfirm, { color: colors.textSecondary }]}>
                  ¿Es tu gimnasio? Al continuar le llegará tu solicitud para aprobarla.
                </Text>
                <PrimaryButton
                  label="Enviar solicitud"
                  icon="paper-plane-outline"
                  onPress={handleUnirse}
                  loading={loading}
                />
              </Card>
            ) : (
              <PrimaryButton
                label="Buscar gimnasio"
                icon="search-outline"
                onPress={handleBuscar}
                loading={loading}
              />
            )}

            <View style={[styles.noteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={brand.primary} />
              <Text style={[styles.noteText, { color: colors.textSecondary }]}>
                Mientras tanto puedes seguir usando la app con normalidad: tus rutinas, tus entrenamientos y tu
                progreso no dependen de ningún gimnasio.
              </Text>
            </View>
          </Reveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xxl, gap: Spacing.xl },
  header: { alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  title: { fontFamily: FontFamily.bold, fontSize: 22, marginTop: Spacing.sm },
  subtitle: { fontSize: 13.5, textAlign: 'center', maxWidth: 300, lineHeight: 19 },
  form: { gap: Spacing.lg },
  previewCard: { gap: Spacing.lg },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  previewName: { fontFamily: FontFamily.semiBold, fontSize: 16 },
  previewMeta: { fontSize: 12.5, marginTop: 2 },
  previewConfirm: { fontSize: 13, lineHeight: 18 },
  noteBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
  },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
});
