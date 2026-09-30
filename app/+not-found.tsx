import { Link, Stack } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import { IconCircle } from '@/components/ui/IconCircle';
import Colors from '@/constants/Colors';
import { FontFamily, Spacing } from '@/constants/Theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'No encontrado' }} />
      <View style={styles.container}>
        <IconCircle name="compass-outline" tone="brand" size={72} />
        <Text style={styles.title}>Esta pantalla no existe</Text>
        <Text style={styles.subtitle}>El enlace que seguiste no lleva a ningún lado dentro de GymTrack.</Text>

        <Link href="/(tabs)" asChild>
          <Pressable style={styles.link}>
            <Ionicons name="home-outline" size={18} color={Colors.brand.primary} />
            <Text style={styles.linkText}>Ir al inicio</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, gap: Spacing.md },
  title: { fontFamily: FontFamily.bold, fontSize: 20, marginTop: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', opacity: 0.65, maxWidth: 280 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  linkText: { fontFamily: FontFamily.semiBold, fontSize: 15, color: Colors.brand.primary },
});
