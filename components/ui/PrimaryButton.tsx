import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '@/hooks/useTheme';
import { FontFamily, Radius, Shadow, Spacing } from '@/constants/Theme';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'solid' | 'outline';
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  variant = 'solid',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  // Con el color del gimnasio (o el naranja de GymTrack), igual que el resto
  // de la app; el texto toma el color que se lee sobre él.
  const { brand, onPrimary } = useTheme();

  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        scaleTo={0.97}
        style={[styles.outline, { borderColor: brand.primary, opacity: isDisabled ? 0.5 : 1 }]}>
        <ButtonContent label={label} icon={icon} loading={loading} textColor={brand.primaryDark} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.96}
      haptic
      style={{ opacity: isDisabled ? 0.6 : 1 }}>
      <LinearGradient
        colors={[brand.primaryLight, brand.primary, brand.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.solid, Shadow.brand, { shadowColor: brand.primary }]}>
        <ButtonContent label={label} icon={icon} loading={loading} textColor={onPrimary} />
      </LinearGradient>
    </AnimatedPressable>
  );
}

function ButtonContent({
  label,
  icon,
  loading,
  textColor,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  textColor: string;
}) {
  return (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={textColor} /> : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  solid: {
    borderRadius: Radius.pill,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderRadius: Radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 20,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15.5,
  },
});
