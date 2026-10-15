import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox } from '@/components/ui/Field';
import { COLOR_ESTRELLA } from './Estrellas';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { guardarResena, MAX_COMENTARIO, type MiResena, type Resena } from '@/lib/tienda';

const TEXTOS = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];

// Hoja para escribir o editar la reseña propia: estrellas de 1 a 5 y un
// comentario opcional de hasta 500 caracteres.
export function EditorResena({
  visible,
  gymId,
  productoId,
  productoNombre,
  actual,
  onCerrar,
  onGuardada,
}: {
  visible: boolean;
  gymId: string;
  productoId: string;
  productoNombre: string;
  actual: Resena | null;
  onCerrar: () => void;
  onGuardada: (mia: MiResena) => void;
}) {
  const { colors, brand } = useTheme();
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setEstrellas(actual?.estrellas ?? 0);
    setComentario(actual?.comentario ?? '');
    setError(null);
  }, [visible, actual]);

  async function guardar() {
    if (estrellas < 1) {
      setError('Elige de 1 a 5 estrellas.');
      return;
    }
    setGuardando(true);
    try {
      onGuardada(await guardarResena(gymId, productoId, estrellas, comentario.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar tu reseña.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fondo}>
        <View style={[styles.hoja, { backgroundColor: colors.surface }]}>
          <View style={styles.encabezado}>
            <Text style={[styles.titulo, { color: colors.text }]}>{actual ? 'Edita tu reseña' : 'Califica tu compra'}</Text>
            <AnimatedPressable onPress={onCerrar} hitSlop={10} haptic={false} accessibilityLabel="Cerrar">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </AnimatedPressable>
          </View>
          <Text style={[styles.producto, { color: colors.textSecondary }]} numberOfLines={2}>
            {productoNombre}
          </Text>

          <View style={styles.estrellas}>
            {[1, 2, 3, 4, 5].map((n) => (
              <AnimatedPressable
                key={n}
                onPress={() => setEstrellas(n)}
                scaleTo={0.8}
                accessibilityLabel={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}>
                <Ionicons name={estrellas >= n ? 'star' : 'star-outline'} size={38} color={COLOR_ESTRELLA} />
              </AnimatedPressable>
            ))}
          </View>
          <Text style={[styles.textoEstrellas, { color: colors.text }]}>{TEXTOS[estrellas] || 'Toca las estrellas'}</Text>

          <TextInput
            value={comentario}
            onChangeText={setComentario}
            placeholder="Cuéntales a otros miembros qué te pareció (opcional)"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={MAX_COMENTARIO}
            style={[styles.comentario, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          />
          <Text style={[styles.contador, { color: colors.textSecondary }]}>
            {comentario.length}/{MAX_COMENTARIO}
          </Text>

          {error ? <ErrorBox message={error} /> : null}
          <PrimaryButton label="Publicar reseña" icon="send-outline" onPress={guardar} loading={guardando} />
          <Text style={[styles.nota, { color: brand.primaryDark }]}>Tu reseña se publica con tu nombre y la inicial de tu apellido.</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hoja: {
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.md,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontFamily: FontFamily.bold, fontSize: 18 },
  producto: { fontSize: 13 },
  estrellas: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  textoEstrellas: { textAlign: 'center', fontFamily: FontFamily.semiBold, fontSize: 14 },
  comentario: {
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  contador: { fontSize: 11.5, textAlign: 'right', marginTop: -Spacing.sm },
  nota: { fontSize: 11.5, textAlign: 'center' },
});
