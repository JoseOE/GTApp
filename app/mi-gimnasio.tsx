import { Image, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Grupo, FilaDato } from '@/components/ui/Grupo';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { StateCard } from '@/components/ui/StateCard';
import { Radius, Spacing, Type } from '@/constants/Theme';
import { tipografiaDe } from '@/constants/Tipografias';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { dinero } from '@/lib/formato';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// "2026-11-25" → "25 de noviembre" (a mano: new Date con una fecha suelta la toma en UTC).
function fechaLarga(iso: string | null) {
  if (!iso) return null;
  const [, mes, dia] = iso.split('-').map(Number);
  return mes && dia ? `${dia} de ${MESES[mes - 1]}` : null;
}

// Mi gimnasio: la ficha completa que antes ocupaba Inicio. Se abre desde la
// portada o desde la fila "Mi gimnasio".
export default function MiGimnasioScreen() {
  const { colors } = useTheme();
  const { account } = useAccount();
  useAccountRefreshOnFocus();

  const gym = account?.gym;
  if (!account || !gym) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <StateCard
            icon="business-outline"
            tone="brand"
            title="Todavía no tienes gimnasio"
            message="Vincúlalo con el código que te dan en recepción."
            actionLabel="Tengo un código"
            actionIcon="key-outline"
            onAction={() => router.replace('/gym-join')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const letra = tipografiaDe(gym.tipografia);
  const estado =
    account.membershipStatus === 'pending'
      ? 'En revisión'
      : account.membershipStatus === 'inactive'
        ? 'Pausada'
        : account.diasParaVencer != null && account.diasParaVencer < 0
          ? 'Vencida'
          : 'Activa';
  const proximoPago = fechaLarga(account.fechaProximoPago);
  const telefono = gym.telefono?.trim();
  const direccion = gym.direccion?.trim();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabeza}>
          {gym.logo ? (
            <View style={[styles.logo, { borderColor: colors.border }]}>
              <Image source={{ uri: gym.logo }} style={styles.logoImg} resizeMode="contain" />
            </View>
          ) : (
            <View style={[styles.logo, styles.sinLogo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="business" size={26} color={colors.textSecondary} />
            </View>
          )}
          <Text
            style={{
              fontFamily: letra.familia,
              fontSize: Math.round(30 * letra.escala),
              letterSpacing: letra.tracking,
              color: colors.text,
              textAlign: 'center',
            }}
            numberOfLines={2}
            adjustsFontSizeToFit>
            {gym.nombre}
          </Text>
        </View>

        <Grupo titulo="Tu membresía">
          <FilaDato icon="shield-checkmark-outline" etiqueta="Estado" valor={estado} ultima={!proximoPago && gym.cuotaMensual == null} />
          {proximoPago ? (
            <FilaDato icon="calendar-outline" etiqueta="Próximo pago" valor={proximoPago} ultima={gym.cuotaMensual == null} />
          ) : null}
          {gym.cuotaMensual != null ? (
            <FilaDato icon="cash-outline" etiqueta="Cuota mensual" valor={dinero(gym.cuotaMensual)} ultima />
          ) : null}
        </Grupo>

        {account.hasGymAccess ? (
          <>
            <Grupo titulo="Horario y contacto">
              {gym.horario ? <FilaDato icon="time-outline" etiqueta="Horario" valor={gym.horario} ultima={!direccion && !telefono} /> : null}
              {direccion ? (
                <FilaDato
                  icon="location-outline"
                  etiqueta="Dirección"
                  valor={direccion}
                  accion="map-outline"
                  onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`)}
                  ultima={!telefono}
                />
              ) : null}
              {telefono ? (
                <FilaDato
                  icon="call-outline"
                  etiqueta="Teléfono"
                  valor={telefono}
                  accion="call"
                  onPress={() => Linking.openURL(`tel:${telefono.replace(/[^\d+]/g, '')}`)}
                  ultima
                />
              ) : null}
              {!gym.horario && !direccion && !telefono ? (
                <FilaDato icon="information-circle-outline" etiqueta="Sin datos" valor="El gimnasio todavía no los agrega." ultima />
              ) : null}
            </Grupo>

            <Grupo titulo="Del gimnasio">
              <FilaDato
                icon="megaphone-outline"
                etiqueta="Anuncios"
                valor="Cierres, horarios y promociones"
                onPress={() => router.push('/anuncios')}
                ultima
              />
            </Grupo>

            <Grupo titulo="Instalaciones">
              {gym.equipamiento ? <FilaDato icon="barbell-outline" etiqueta="Equipamiento" valor={gym.equipamiento} /> : null}
              <FilaDato
                icon="fitness-outline"
                etiqueta="Máquinas y ejercicios"
                valor="Qué puedes hacer en cada una"
                onPress={() => router.push('/gym-machines')}
                ultima
              />
            </Grupo>
          </>
        ) : (
          <Text style={[Type.footnote, styles.nota, { color: colors.textSecondary }]}>
            {account.membershipStatus === 'pending'
              ? 'Verás el horario, el contacto y el equipo en cuanto el gimnasio apruebe tu solicitud.'
              : 'El horario, el contacto y el equipo vuelven a verse cuando el gimnasio reactive tu membresía.'}
          </Text>
        )}

        {account.membershipStatus === 'inactive' ? (
          <PrimaryButton label="Vincular otro gimnasio" icon="key-outline" variant="outline" onPress={() => router.push('/gym-join')} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
  cabeza: { alignItems: 'center', gap: Spacing.md },
  logo: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 8,
    backgroundColor: '#FFFFFF',
  },
  sinLogo: { alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: '100%', height: '100%' },
  nota: { textAlign: 'center', paddingHorizontal: Spacing.lg },
});
