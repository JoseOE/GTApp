import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { useAccount } from '@/lib/AccountContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { StateCard } from '@/components/ui/StateCard';
import { Reveal } from '@/components/ui/Reveal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { FontFamily, Spacing } from '@/constants/Theme';
import { fetchMyMachines, type Machine } from '@/lib/api';

// Equipo del gimnasio con los ejercicios que ese gimnasio capturó para cada
// máquina. No es un catálogo genérico: dos gimnasios con la misma máquina
// pueden ofrecer ejercicios distintos, y aquí se ve el del tuyo.
export default function GymMachinesScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [machines, setMachines] = useState<Machine[] | null>(null);

  useEffect(() => {
    if (!account?.id || !account.hasGymAccess) {
      setMachines([]);
      return;
    }
    let cancelado = false;
    fetchMyMachines(account.id)
      .then((data) => {
        if (!cancelado) setMachines(data);
      })
      .catch(() => {
        if (!cancelado) setMachines([]);
      });
    return () => {
      cancelado = true;
    };
  }, [account?.id, account?.hasGymAccess]);

  if (!machines) {
    return (
      <SafeAreaView style={[styles.safe, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={brand.primary} />
      </SafeAreaView>
    );
  }

  if (!account?.hasGymAccess) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StateCard
            icon="lock-closed"
            tone="danger"
            title="Equipo no disponible"
            message="Necesitas una membresía activa para ver el equipo de este gimnasio."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const zonas: Record<string, Machine[]> = {};
  machines.forEach((m) => {
    const zona = m.zona?.trim() || 'Sin zona';
    (zonas[zona] ??= []).push(m);
  });
  const nombresDeZona = Object.keys(zonas).sort();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {machines.length === 0 ? (
          <StateCard
            icon="cog-outline"
            tone="muted"
            title="Tu gimnasio aún no capturó su equipo"
            message="Cuando registre sus máquinas desde el panel web, aquí verás cada una con los ejercicios que puedes hacer en ella."
          />
        ) : (
          <>
            <Text style={[styles.intro, { color: colors.textSecondary }]}>
              {machines.length} máquinas en {account.gym?.nombre}. Toca una para ver qué ejercicios puedes hacer.
            </Text>
            {nombresDeZona.map((zona, zi) => (
              <View key={zona} style={{ gap: Spacing.md }}>
                <Text style={[styles.zona, { color: colors.textSecondary }]}>{zona.toUpperCase()}</Text>
                {zonas[zona].map((m, i) => (
                  <MachineCard key={m.id} machine={m} index={zi * 3 + i} />
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MachineCard({ machine, index }: { machine: Machine; index: number }) {
  const { colors } = useTheme();
  const [abierto, setAbierto] = useState(false);
  const ejercicios = machine.ejercicios ?? [];

  return (
    <Reveal index={index}>
      <Card style={styles.card}>
        {/* Toda la cabecera es el área de toque: un chevron de 18px es
            demasiado pequeño para acertarle con el pulgar. */}
        <AnimatedPressable
          onPress={() => setAbierto((v) => !v)}
          disabled={ejercicios.length === 0}
          scaleTo={0.99}
          haptic={false}>
          <View style={styles.cardTop}>
            <IconCircle name="fitness-outline" tone="brand" size={42} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: colors.text }]}>{machine.nombre}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {ejercicios.length} {ejercicios.length === 1 ? 'ejercicio' : 'ejercicios'}
                {machine.cantidad && machine.cantidad > 1 ? ` · ${machine.cantidad} unidades` : ''}
              </Text>
            </View>
            {ejercicios.length > 0 ? (
              <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
            ) : null}
          </View>
        </AnimatedPressable>

        {machine.descripcion ? (
          <Text style={[styles.descripcion, { color: colors.textSecondary }]}>{machine.descripcion}</Text>
        ) : null}

        {abierto && ejercicios.length > 0 ? (
          <View style={[styles.lista, { borderTopColor: colors.border }]}>
            {ejercicios.map((e) => (
              <View key={e.id} style={styles.ejercicio}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ejercicioNombre, { color: colors.text }]}>{e.nombre}</Text>
                  {e.instrucciones ? (
                    <Text style={[styles.instrucciones, { color: colors.textSecondary }]}>{e.instrucciones}</Text>
                  ) : null}
                </View>
                <View style={styles.ejercicioMeta}>
                  {e.musculo ? <Badge label={e.musculo} tone="muted" /> : null}
                  {e.series ? (
                    <Text style={[styles.seriesTexto, { color: colors.textSecondary }]}>
                      {e.series} × {e.repeticiones ?? ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
    </Reveal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.lg },
  intro: { fontSize: 13, lineHeight: 18 },
  zona: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6 },
  card: { gap: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 15 },
  meta: { fontSize: 12.5, marginTop: 2 },
  descripcion: { fontSize: 12.5, marginTop: Spacing.sm, lineHeight: 17 },
  lista: { borderTopWidth: 1, marginTop: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.md },
  ejercicio: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  ejercicioNombre: { fontFamily: FontFamily.medium, fontSize: 14 },
  instrucciones: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  ejercicioMeta: { alignItems: 'flex-end', gap: 4 },
  seriesTexto: { fontSize: 11.5, fontFamily: FontFamily.medium },
});
