import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { IconCircle } from '@/components/ui/IconCircle';
import { ListRow } from '@/components/ui/ListRow';
import { FontFamily, Spacing } from '@/constants/Theme';
import { useAccount, useAccountRefreshOnFocus } from '@/lib/AccountContext';
import { cancelarRecordatorios } from '@/lib/notifications';
import { puedeComprar } from '@/lib/CarritoContext';

// Mi cuenta: quién eres, tu gimnasio y lo que se hace con la cuenta
// (pedidos, contraseña, cerrar sesión).
export default function CuentaScreen() {
  const { colors } = useTheme();
  const { account, signOut } = useAccount();
  useAccountRefreshOnFocus();
  function cerrarSesion() {
    Alert.alert('Cerrar sesión', '¿Quieres salir de tu cuenta en este teléfono?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          // Los recordatorios locales son de este usuario: se van con él.
          await cancelarRecordatorios();
          await signOut();
          if (router.canDismiss()) router.dismissAll();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {account ? (
          <Card style={styles.perfil}>
            <IconCircle name="person" tone="brand" size={52} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nombre, { color: colors.text }]}>{account.nombre}</Text>
              <Text style={[styles.email, { color: colors.textSecondary }]}>{account.email}</Text>
              {account.gym ? (
                <Text style={[styles.email, { color: colors.textSecondary }]}>{account.gym.nombre}</Text>
              ) : null}
            </View>
            {account.contrasenaTemporal ? <Badge label="Contraseña temporal" tone="warning" /> : null}
          </Card>
        ) : null}

        {account?.gymId ? (
          <>
            <Text style={[styles.seccion, { color: colors.textSecondary }]}>TIENDA</Text>
            <Card padded={false}>
              <ListRow
                icon="receipt-outline"
                label="Mis pedidos"
                hint="Comprobantes y el QR para recoger en recepción"
                onPress={() => router.push('/pedidos')}
              />
            </Card>
          </>
        ) : null}

        {account?.gymId && puedeComprar(account) ? (
          <>
            <Text style={[styles.seccion, { color: colors.textSecondary }]}>GYMTRACK</Text>
            <Card padded={false}>
              <ListRow
                icon="star-outline"
                label="Tu opinión sobre GymTrack"
                hint="Con 4 estrellas o más sale en la página de inicio"
                onPress={() => router.push('/opinion')}
              />
            </Card>
          </>
        ) : null}

        <Text style={[styles.seccion, { color: colors.textSecondary }]}>SEGURIDAD</Text>
        <Card padded={false}>
          <ListRow
            icon="lock-closed-outline"
            label="Cambiar contraseña"
            hint="Con un código que llega a tu correo"
            onPress={() => router.push('/cambiar-contrasena')}
            bordered
          />
          <ListRow icon="log-out-outline" label="Cerrar sesión" onPress={cerrarSesion} danger />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.xl, gap: Spacing.md, paddingBottom: Spacing.xxxl },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  nombre: { fontFamily: FontFamily.semiBold, fontSize: 16 },
  email: { fontSize: 12.5, marginTop: 1 },
  seccion: { fontFamily: FontFamily.semiBold, fontSize: 11.5, letterSpacing: 0.6, marginTop: Spacing.md },
});
