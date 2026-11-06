import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Reveal } from '@/components/ui/Reveal';
import type { BadgeTone } from '@/components/ui/Badge';
import { Radius, Spacing, Type } from '@/constants/Theme';
import type { Account } from '@/lib/api';
import {
  anunciosVistos,
  fetchAnuncios,
  marcarAnuncioVisto,
  TIPO_ANUNCIO,
  vigenciaAnuncio,
  type Anuncio,
} from '@/lib/anuncios';

// Pocos a la vez: Inicio no debe volver a llenarse; el resto está en "Ver todos".
const MAX_EN_INICIO = 2;

// Los anuncios vigentes del gimnasio en Inicio (hasta 2). Cada uno se cierra
// con "Entendido"; la pantalla Anuncios los sigue mostrando todos.
export function AnunciosInicio({ account }: { account: Account }) {
  const { colors } = useTheme();
  const [vigentes, setVigentes] = useState<Anuncio[]>([]);
  const [vistos, setVistos] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      if (!account.hasGymAccess) {
        setVigentes([]);
        return;
      }
      let cancelado = false;
      Promise.all([fetchAnuncios(), anunciosVistos(account.id)])
        .then(([lista, ya]) => {
          if (cancelado) return;
          setVigentes(lista);
          setVistos(ya);
        })
        .catch(() => {});
      return () => {
        cancelado = true;
      };
    }, [account.id, account.hasGymAccess])
  );

  const pendientes = vigentes.filter((a) => !vistos.has(a.id)).slice(0, MAX_EN_INICIO);
  if (pendientes.length === 0) return null;

  function entendido(id: string) {
    setVistos((ya) => new Set(ya).add(id));
    marcarAnuncioVisto(account.id, id, vigentes.map((a) => a.id));
  }

  return (
    <Reveal index={1} style={{ gap: Spacing.sm }}>
      <View style={styles.cabeza}>
        <Text style={[Type.overline, { color: colors.textSecondary }]}>DE {account.gym?.nombre.toUpperCase() ?? 'TU GIMNASIO'}</Text>
        {vigentes.length > 0 ? (
          <AnimatedPressable onPress={() => router.push('/anuncios')} hitSlop={8} accessibilityRole="link">
            <Text style={[Type.caption, { color: colors.textSecondary }]}>
              Ver todos{vigentes.length > 1 ? ` (${vigentes.length})` : ''}
            </Text>
          </AnimatedPressable>
        ) : null}
      </View>
      {pendientes.map((a) => (
        <TarjetaAnuncio key={a.id} anuncio={a} onEntendido={() => entendido(a.id)} />
      ))}
    </Reveal>
  );
}

export function TarjetaAnuncio({ anuncio, onEntendido }: { anuncio: Anuncio; onEntendido?: () => void }) {
  const { colors, brand } = useTheme();
  const tipo = TIPO_ANUNCIO[anuncio.tipo] ?? TIPO_ANUNCIO.aviso;
  const color: Record<BadgeTone, string> = {
    brand: brand.primary,
    success: brand.success,
    warning: brand.warning,
    info: brand.info,
    danger: brand.danger,
    muted: colors.textSecondary,
  };
  const c = color[tipo.tono];
  const vigencia = vigenciaAnuncio(anuncio);

  return (
    <View
      style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: c }]}
      accessible={!onEntendido}
      accessibilityLabel={`${tipo.nombre}: ${anuncio.titulo}. ${anuncio.texto}`}>
      <View style={styles.fila}>
        <Ionicons name={tipo.icono} size={16} color={c} />
        <Text style={[Type.caption, { color: c }]}>{tipo.nombre.toUpperCase()}</Text>
        {vigencia ? <Text style={[Type.caption, { color: colors.textSecondary }]}>· {vigencia}</Text> : null}
      </View>
      <Text style={[Type.headline, { color: colors.text }]}>{anuncio.titulo}</Text>
      <Text style={[Type.footnote, { color: colors.textSecondary }]}>{anuncio.texto}</Text>
      {onEntendido ? (
        <AnimatedPressable onPress={onEntendido} hitSlop={8} style={styles.entendido} accessibilityRole="button" accessibilityLabel={`Entendido: ${anuncio.titulo}`}>
          <Text style={[Type.callout, { color: brand.primaryDark }]}>Entendido</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tarjeta: {
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 4,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  entendido: { alignSelf: 'flex-end', marginTop: Spacing.xs, paddingVertical: 2 },
});
