import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox } from '@/components/ui/Field';
import { COLOR_ESTRELLA } from '@/components/tienda/Estrellas';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { borrarOpinion, fetchMiOpinion, guardarOpinion, MAX_OPINION, MIN_OPINION, type Opinion } from '@/lib/opiniones';

const TEXTOS = ['', 'Mala', 'Regular', 'Buena', 'Muy buena', 'Excelente'];

// Tu opinión sobre GymTrack: estrellas y un comentario. Con 4 o más sale en la
// página de inicio de GymTrack con la foto de tu gimnasio.
export default function OpinionScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [actual, setActual] = useState<Opinion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [estrellas, setEstrellas] = useState(0);
  const [texto, setTexto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    fetchMiOpinion()
      .then((o) => {
        setActual(o);
        setEstrellas(o?.estrellas ?? 0);
        setTexto(o?.texto ?? '');
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  async function guardar() {
    setAviso(null);
    if (estrellas < 1) return setError('Elige de 1 a 5 estrellas.');
    if (texto.trim().length < MIN_OPINION) return setError(`Escribe al menos ${MIN_OPINION} caracteres.`);
    setError(null);
    setGuardando(true);
    try {
      const o = await guardarOpinion(estrellas, texto.trim());
      setActual(o);
      setAviso(o.estrellas >= 4 ? '¡Gracias! Tu opinión ya aparece en la página de GymTrack.' : 'Gracias por tu opinión: nos ayuda a mejorar.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar tu opinión.');
    } finally {
      setGuardando(false);
    }
  }

  function borrar() {
    Alert.alert('Borrar tu opinión', 'Dejará de aparecer en la página de GymTrack.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await borrarOpinion();
            setActual(null);
            setEstrellas(0);
            setTexto('');
            setAviso('Tu opinión se borró.');
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo borrar tu opinión.');
          }
        },
      },
    ]);
  }

  if (cargando) {
    return (
      <View style={[styles.centro, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            ¿Cómo te ha ido con GymTrack{account?.gym ? ` en ${account.gym.nombre}` : ''}? Con 4 estrellas o más, tu opinión aparece en la página de
            inicio con tu nombre corto y la foto de tu gimnasio.
          </Text>

          <Card style={{ gap: Spacing.md }}>
            <View style={styles.estrellas}>
              {[1, 2, 3, 4, 5].map((n) => (
                <AnimatedPressable
                  key={n}
                  onPress={() => setEstrellas(n)}
                  scaleTo={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: estrellas === n }}
                  accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}>
                  <Ionicons name={estrellas >= n ? 'star' : 'star-outline'} size={40} color={COLOR_ESTRELLA} />
                </AnimatedPressable>
              ))}
            </View>
            <Text style={[styles.textoEstrellas, { color: colors.text }]}>{TEXTOS[estrellas] || 'Toca las estrellas'}</Text>

            <TextInput
              value={texto}
              onChangeText={setTexto}
              placeholder="¿Qué te ha gustado? ¿Qué mejorarías?"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={MAX_OPINION}
              style={[styles.texto, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <Text style={[styles.contador, { color: colors.textSecondary }]}>
              {texto.trim().length}/{MAX_OPINION}
            </Text>

            {error ? <ErrorBox message={error} /> : null}
            {aviso ? <Text style={[styles.aviso, { color: brand.success }]}>{aviso}</Text> : null}

            <PrimaryButton
              label={actual ? 'Actualizar opinión' : 'Publicar opinión'}
              icon={actual ? 'save-outline' : 'send-outline'}
              onPress={guardar}
              loading={guardando}
            />
            {actual ? <PrimaryButton label="Borrar mi opinión" icon="trash-outline" variant="outline" onPress={borrar} /> : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxxl },
  intro: { fontSize: 13.5, lineHeight: 19 },
  estrellas: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  textoEstrellas: { textAlign: 'center', fontFamily: FontFamily.semiBold, fontSize: 14 },
  texto: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  contador: { fontSize: 11.5, textAlign: 'right', marginTop: -Spacing.sm },
  aviso: { fontFamily: FontFamily.semiBold, fontSize: 13, textAlign: 'center' },
});
