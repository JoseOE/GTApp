import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from './AnimatedPressable';
import { useAccount } from '@/lib/AccountContext';
import { FontFamily, Spacing, Type } from '@/constants/Theme';

// Título grande de cada pestaña, como en iOS: va en la pantalla (no en una
// barra aparte) y a la derecha lleva el acceso a Mi cuenta.
export function TituloGrande({ titulo, subtitulo, derecha }: { titulo: string; subtitulo?: string; derecha?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.fila}>
      <View style={{ flex: 1 }}>
        <Text style={[Type.largeTitle, { color: colors.text }]} accessibilityRole="header">
          {titulo}
        </Text>
        {subtitulo ? <Text style={[Type.footnote, { color: colors.textSecondary }]}>{subtitulo}</Text> : null}
      </View>
      {derecha ?? <BotonCuenta />}
    </View>
  );
}

// La inicial de la cuenta en un círculo; abre Mi cuenta. Sobre una foto
// (la portada de Inicio) se usa la versión clara.
export function BotonCuenta({ sobreFoto = false }: { sobreFoto?: boolean }) {
  const { colors } = useTheme();
  const { account } = useAccount();
  const inicial = (account?.nombre?.trim()[0] ?? '?').toUpperCase();
  return (
    <AnimatedPressable
      onPress={() => router.push('/cuenta')}
      hitSlop={10}
      scaleTo={0.9}
      accessibilityRole="button"
      accessibilityLabel="Mi cuenta"
      style={[
        styles.boton,
        sobreFoto
          ? { backgroundColor: 'rgba(0,0,0,0.35)', borderColor: 'rgba(255,255,255,0.45)' }
          : { backgroundColor: colors.surface, borderColor: colors.border },
      ]}>
      <Text style={[styles.inicial, { color: sobreFoto ? '#FFFFFF' : colors.text }]}>{inicial}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xs },
  boton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inicial: { fontFamily: FontFamily.bold, fontSize: 16 },
});
