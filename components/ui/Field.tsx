import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from './AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';

type FieldProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  hint?: string;
} & React.ComponentProps<typeof TextInput>;

// Campo de formulario compartido por login, registro y vinculación de gimnasio.
export function Field({ label, icon, rightIcon, onRightIconPress, hint, ...inputProps }: FieldProps) {
  const { colors, brand } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.surface,
            borderColor: focused ? brand.primary : colors.border,
          },
        ]}>
        <Ionicons name={icon} size={19} color={colors.textSecondary} />
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholderTextColor={colors.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {rightIcon ? (
          <AnimatedPressable onPress={onRightIconPress} hitSlop={10} haptic={false} scaleTo={0.85}>
            <Ionicons name={rightIcon} size={19} color={colors.textSecondary} />
          </AnimatedPressable>
        ) : null}
      </View>
      {hint ? <Text style={[styles.hint, { color: colors.textSecondary }]}>{hint}</Text> : null}
    </View>
  );
}

// Caja de error compartida, para que todos los formularios fallen igual.
export function ErrorBox({ message }: { message: string }) {
  const { brand } = useTheme();
  return (
    <View style={[styles.errorBox, { backgroundColor: brand.danger + '15' }]}>
      <Ionicons name="alert-circle-outline" size={16} color={brand.danger} />
      <Text style={[styles.errorText, { color: brand.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.xs },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: 13.5 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    height: 52,
  },
  input: { flex: 1, fontFamily: FontFamily.regular, fontSize: 15, height: '100%' },
  hint: { fontSize: 11.5, lineHeight: 16 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  errorText: { flex: 1, fontSize: 12.5, fontFamily: FontFamily.medium },
});
