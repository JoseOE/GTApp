import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { AnimatedPressable } from './AnimatedPressable';
import Colors from '@/constants/Colors';
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

  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        scaleTo={0.97}
        style={[styles.outline, { opacity: isDisabled ? 0.5 : 1 }]}>
        <ButtonContent label={label} icon={icon} loading={loading} textColor={Colors.brand.primary} />
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.96}
      style={{ opacity: isDisabled ? 0.6 : 1 }}>
      <LinearGradient
        colors={[Colors.brand.primaryLight, Colors.brand.primary, Colors.brand.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.solid, Shadow.brand]}>
        <ButtonContent label={label} icon={icon} loading={loading} textColor="#fff" />
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
    borderColor: Colors.brand.primary,
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
