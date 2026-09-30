import { StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { Card } from './Card';
import { IconCircle } from './IconCircle';
import { PrimaryButton } from './PrimaryButton';
import { Reveal } from './Reveal';
import type { BadgeTone } from './Badge';
import { FontFamily, Spacing } from '@/constants/Theme';

type StateCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: BadgeTone;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
  actionVariant?: 'solid' | 'outline';
  index?: number;
};

// Tarjeta de estado vacío / bloqueado / en espera. Un solo componente para que
// "sin gimnasio", "solicitud pendiente" y "dado de baja" se vean como hermanos.
export function StateCard({
  icon,
  tone = 'muted',
  title,
  message,
  actionLabel,
  actionIcon,
  onAction,
  actionVariant = 'solid',
  index = 0,
}: StateCardProps) {
  const { colors } = useTheme();
  return (
    <Reveal index={index}>
      <Card style={styles.card}>
        <IconCircle name={icon} tone={tone} size={56} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
        {actionLabel && onAction ? (
          <Reveal index={index + 1} style={styles.action}>
            <PrimaryButton label={actionLabel} icon={actionIcon} onPress={onAction} variant={actionVariant} />
          </Reveal>
        ) : null}
      </Card>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xxl },
  title: { fontFamily: FontFamily.bold, fontSize: 18, textAlign: 'center', marginTop: Spacing.sm },
  text: { fontSize: 13.5, textAlign: 'center', lineHeight: 19, maxWidth: 300 },
  action: { alignSelf: 'stretch', marginTop: Spacing.md },
});
