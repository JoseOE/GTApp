import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius } from '@/constants/Theme';
import { formatoPeso } from '@/lib/entrenamiento';

// La hora actual, refrescada cada segundo: para el cronómetro y el descanso.
export function useAhora(activo = true) {
  const [ahora, setAhora] = useState(Date.now());
  useEffect(() => {
    if (!activo) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activo]);
  return ahora;
}

// [−] valor [+]: se ajusta de paso en paso con los botones, o se escribe.
export function Contador({
  valor,
  paso,
  decimales,
  etiqueta,
  deshabilitado,
  onCambio,
}: {
  valor: number | null;
  paso: number;
  decimales?: boolean;
  etiqueta: string;
  deshabilitado?: boolean;
  onCambio: (v: number | null) => void;
}) {
  const { colors } = useTheme();
  const [texto, setTexto] = useState(formatoPeso(valor));

  // Si el valor cambia desde fuera (botones, notificación), se refleja.
  // Mientras se escribe ("62.") el texto manda, para no borrar el punto.
  useEffect(() => {
    setTexto((t) => ((t === '' ? null : Number(t)) === valor ? t : formatoPeso(valor)));
  }, [valor]);

  const mover = (signo: 1 | -1) => {
    const base = valor ?? 0;
    const nuevo = Math.max(0, Math.round((base + signo * paso) * 100) / 100);
    onCambio(nuevo);
  };

  return (
    <View style={[styles.caja, { borderColor: colors.border, backgroundColor: colors.background, opacity: deshabilitado ? 0.6 : 1 }]}>
      <AnimatedPressable
        onPress={() => mover(-1)}
        disabled={deshabilitado}
        hitSlop={6}
        scaleTo={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Menos ${etiqueta}`}
        style={styles.boton}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </AnimatedPressable>
      <TextInput
        value={texto}
        editable={!deshabilitado}
        onChangeText={(t) => {
          const limpio = decimales ? t.replace(',', '.').replace(/[^0-9.]/g, '') : t.replace(/[^0-9]/g, '');
          setTexto(limpio);
          const n = Number(limpio);
          onCambio(limpio === '' || Number.isNaN(n) ? null : n);
        }}
        keyboardType={decimales ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        placeholder="–"
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={etiqueta}
        style={[styles.valor, { color: colors.text }]}
      />
      <AnimatedPressable
        onPress={() => mover(1)}
        disabled={deshabilitado}
        hitSlop={6}
        scaleTo={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Más ${etiqueta}`}
        style={styles.boton}>
        <Ionicons name="add" size={18} color={colors.text} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.sm,
    height: 42,
  },
  boton: { width: 34, height: '100%', alignItems: 'center', justifyContent: 'center' },
  valor: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    paddingVertical: 0,
    minWidth: 36,
  },
});
