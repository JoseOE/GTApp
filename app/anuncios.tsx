import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { StateCard } from '@/components/ui/StateCard';
import { TarjetaAnuncio } from '@/components/inicio/AnunciosInicio';
import { Spacing, Type } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { useAccount } from '@/lib/AccountContext';
import { fetchAnuncios, type Anuncio } from '@/lib/anuncios';

// Todos los anuncios vigentes del gimnasio, también los que ya se cerraron en
// Inicio. Se abre desde Inicio, desde Mi gimnasio o al tocar la notificación.
export default function AnunciosScreen() {
  const { colors, brand } = useTheme();
  const { account } = useAccount();
  const [anuncios, setAnuncios] = useState<Anuncio[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setAnuncios(await fetchAnuncios());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los anuncios.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  async function refrescar() {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <FlatList
        data={anuncios ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.lista}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={brand.primary} />}
        ListHeaderComponent={
          error ? <Text style={[Type.callout, { color: brand.danger }]}>{error}</Text> : null
        }
        ListEmptyComponent={
          anuncios == null ? (
            error ? null : <ActivityIndicator color={brand.primary} style={{ marginTop: Spacing.xxl }} />
          ) : (
            <StateCard
              icon="megaphone-outline"
              tone="muted"
              title="Sin anuncios por ahora"
              message={`Aquí verás los avisos de ${account?.gym?.nombre ?? 'tu gimnasio'}: cierres, cambios de horario y promociones.`}
            />
          )
        }
        renderItem={({ item }) => <TarjetaAnuncio anuncio={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  lista: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
});
