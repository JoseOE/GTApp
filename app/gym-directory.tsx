import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { StateCard } from '@/components/ui/StateCard';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { fetchDirectory, type DirectoryGym } from '@/lib/api';
import { foregroundFor } from '@/lib/color';

// Gimnasios que aceptaron aparecer públicamente. Sirve para descubrirlos,
// pero unirse sigue necesitando el código: el gimnasio controla quién entra.
export default function GymDirectoryScreen() {
  const { colors, brand } = useTheme();
  const [gyms, setGyms] = useState<DirectoryGym[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setError(null);
    fetchDirectory()
      .then(setGyms)
      .catch(() => {
        setGyms([]);
        setError('No pudimos cargar el directorio.');
      });
  }, []);

  useEffect(cargar, [cargar]);

  if (!gyms) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Gimnasios que usan GymTrack y aceptaron aparecer aquí. Para unirte necesitas su código de acceso.
        </Text>

        {error ? (
          <StateCard
            icon="cloud-offline-outline"
            tone="danger"
            title="Sin conexión"
            message={error}
            actionLabel="Reintentar"
            actionIcon="refresh-outline"
            onAction={cargar}
          />
        ) : gyms.length === 0 ? (
          <StateCard
            icon="business-outline"
            tone="muted"
            title="Todavía no hay gimnasios listados"
            message="Ningún gimnasio ha activado su perfil público. Si ya vas a uno, pide su código en recepción."
            actionLabel="Tengo un código"
            actionIcon="key-outline"
            onAction={() => router.replace('/gym-join')}
          />
        ) : (
          gyms.map((gym, i) => <GymRow key={gym.id} gym={gym} index={i} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function GymRow({ gym, index }: { gym: DirectoryGym; index: number }) {
  const { colors, brand } = useTheme();
  const color = gym.colorPrimario || brand.primary;

  return (
    <Reveal index={index}>
      <AnimatedPressable onPress={() => router.replace('/gym-join')} scaleTo={0.98} haptic={false}>
        <Card style={styles.card}>
          <View style={styles.row}>
            {gym.logo ? (
              <View style={[styles.logoFrame, { borderColor: colors.border }]}>
                <Image source={{ uri: gym.logo }} style={styles.logo} resizeMode="contain" />
              </View>
            ) : (
              <View style={[styles.logoFrame, styles.inicial, { backgroundColor: color }]}>
                <Text style={[styles.inicialTexto, { color: foregroundFor(color) }]}>
                  {gym.nombre.trim().charAt(0).toUpperCase() || 'G'}
                </Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: colors.text }]}>{gym.nombre}</Text>
              {gym.direccion ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                  {gym.direccion}
                </Text>
              ) : null}
              {gym.horario ? (
                <View style={styles.horarioRow}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>{gym.horario}</Text>
                </View>
              ) : null}
            </View>

            <IconCircle name="chevron-forward" tone="muted" size={32} />
          </View>
        </Card>
      </AnimatedPressable>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  intro: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.xs },
  card: { paddingVertical: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logoFrame: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    backgroundColor: '#FFFFFF',
  },
  logo: { width: '100%', height: '100%' },
  inicial: { padding: 0, borderWidth: 0 },
  inicialTexto: { fontFamily: FontFamily.extraBold, fontSize: 24 },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 15.5 },
  meta: { fontSize: 12.5, marginTop: 2 },
  horarioRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
