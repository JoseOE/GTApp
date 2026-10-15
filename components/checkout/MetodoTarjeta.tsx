import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { ErrorBox, Field } from '@/components/ui/Field';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { LogoPago, type Logo } from './LogoPago';
import { FontFamily, Radius, Spacing } from '@/constants/Theme';
import { ApiError } from '@/lib/api';
import { dinero } from '@/lib/formato';
import { MESES_SIN_INTERESES, tokenizarTarjeta, type TarjetaTokenizada } from '@/lib/tienda';

const MARCAS: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

// Tarjetas que acepta el simulador (las mismas de la tienda web).
const DE_PRUEBA = [
  { numero: '4242 4242 4242 4242', texto: 'Visa crédito · aprobada' },
  { numero: '5555 5555 5555 4444', texto: 'Mastercard crédito · aprobada' },
  { numero: '3782 822463 10005', texto: 'American Express · aprobada' },
  { numero: '4000 0566 5566 5556', texto: 'Visa débito · aprobada' },
  { numero: '5200 8282 8282 8210', texto: 'Mastercard débito · aprobada' },
  { numero: '4000 0000 0000 0002', texto: 'Rechazada' },
];

// La marca por los primeros dígitos, para enseñar el logo mientras se escribe.
function marcaDe(numero: string): Logo | null {
  if (/^4/.test(numero)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(numero)) return 'mastercard';
  if (/^3[47]/.test(numero)) return 'amex';
  return null;
}

// 4-4-4-4, o 4-6-5 en American Express.
function agrupar(digitos: string): string {
  if (/^3[47]/.test(digitos)) {
    return [digitos.slice(0, 4), digitos.slice(4, 10), digitos.slice(10, 15)].filter(Boolean).join(' ');
  }
  return digitos.slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function textoTarjeta(t: TarjetaTokenizada) {
  return `${MARCAS[t.marca] ?? t.marca} ${t.tipo === 'debito' ? 'débito' : 'crédito'} •••• ${t.ultimos4}`;
}

// "Visa crédito •••• 4242 · 6 meses sin intereses de $133.33" o "· de contado".
export function descripcionTarjeta(t: TarjetaTokenizada, meses: number, total: number) {
  return `${textoTarjeta(t)} · ${meses > 1 ? `${meses} meses sin intereses de ${dinero(Math.round((total / meses) * 100) / 100)}` : 'de contado'}`;
}

// Tarjeta de crédito o débito. Los datos se cambian por un token en cuanto se
// capturan: el número completo y el CVC no se guardan en ningún lado.
export function MetodoTarjeta({
  total,
  tarjeta,
  onTarjeta,
  meses,
  onMeses,
}: {
  total: number;
  tarjeta: TarjetaTokenizada | null;
  onTarjeta: (t: TarjetaTokenizada | null) => void;
  meses: number;
  onMeses: (m: number) => void;
}) {
  const { colors, brand } = useTheme();
  const [numero, setNumero] = useState('');
  const [titular, setTitular] = useState('');
  const [vence, setVence] = useState('');
  const [cvc, setCvc] = useState('');
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verPrueba, setVerPrueba] = useState(false);

  const digitos = numero.replace(/\D/g, '');
  const marca = marcaDe(digitos);

  async function usarTarjeta() {
    const [mes = '', anio = ''] = vence.split('/');
    setError(null);
    setValidando(true);
    try {
      const t = await tokenizarTarjeta({ numero: digitos, titular: titular.trim(), mes, anio, cvc });
      // Ya hay token: el número y el CVC se borran de la pantalla.
      setNumero('');
      setCvc('');
      onMeses(1);
      onTarjeta(t);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo validar la tarjeta.');
    } finally {
      setValidando(false);
    }
  }

  if (tarjeta) {
    const credito = tarjeta.tipo === 'credito';
    return (
      <View style={{ gap: Spacing.md }}>
        <View style={[styles.lista, { borderColor: brand.success, backgroundColor: brand.success + '10' }]}>
          {MARCAS[tarjeta.marca] ? <LogoPago nombre={tarjeta.marca as Logo} alto={26} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={[styles.listaTitulo, { color: colors.text }]}>{textoTarjeta(tarjeta)}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Vence {tarjeta.vencimiento}</Text>
          </View>
          <AnimatedPressable onPress={() => onTarjeta(null)} haptic={false} hitSlop={8}>
            <Text style={[styles.enlace, { color: brand.primaryDark }]}>Cambiar</Text>
          </AnimatedPressable>
        </View>

        <Text style={[styles.subtitulo, { color: colors.text }]}>¿Cómo quieres pagar?</Text>
        <View style={{ gap: Spacing.sm }}>
          <Opcion activa={meses <= 1} onPress={() => onMeses(1)} titulo={`De contado · ${dinero(total)}`} />
          {credito
            ? MESES_SIN_INTERESES.map(([m, minimo]) => {
                const alcanza = total + 0.009 >= minimo;
                return (
                  <Opcion
                    key={m}
                    activa={meses === m}
                    disabled={!alcanza}
                    onPress={() => onMeses(m)}
                    titulo={`${m} meses sin intereses de ${dinero(Math.round((total / m) * 100) / 100)}`}
                    nota={alcanza ? undefined : `En compras desde ${dinero(minimo)}`}
                  />
                );
              })
            : null}
        </View>
        {!credito ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Los meses sin intereses son solo con tarjeta de crédito.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.md }}>
      <Field
        label="Número de tarjeta"
        icon="card-outline"
        value={numero}
        onChangeText={(t) => setNumero(agrupar(t.replace(/\D/g, '')))}
        placeholder="1234 5678 9012 3456"
        keyboardType="number-pad"
        maxLength={23}
        autoComplete="off"
        textContentType="none"
      />
      {marca ? (
        <View style={styles.marcaDetectada}>
          <LogoPago nombre={marca} alto={20} />
        </View>
      ) : null}
      <Field
        label="Nombre del titular"
        icon="person-outline"
        value={titular}
        onChangeText={setTitular}
        placeholder="Como aparece en la tarjeta"
        autoCapitalize="characters"
        autoComplete="off"
      />
      <View style={styles.dosColumnas}>
        <View style={{ flex: 1 }}>
          <Field
            label="Vence (MM/AA)"
            icon="calendar-outline"
            value={vence}
            onChangeText={(t) => {
              const d = t.replace(/\D/g, '').slice(0, 4);
              setVence(d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
            }}
            placeholder="12/28"
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="CVC"
            icon="lock-closed-outline"
            value={cvc}
            onChangeText={(t) => setCvc(t.replace(/\D/g, '').slice(0, 4))}
            placeholder={marca === 'amex' ? '1234' : '123'}
            keyboardType="number-pad"
            secureTextEntry
            maxLength={4}
            autoComplete="off"
          />
        </View>
      </View>
      {error ? <ErrorBox message={error} /> : null}
      <PrimaryButton label="Usar esta tarjeta" icon="checkmark-circle-outline" onPress={usarTarjeta} loading={validando} variant="outline" />

      <AnimatedPressable onPress={() => setVerPrueba((v) => !v)} haptic={false} style={styles.pruebaBoton}>
        <Ionicons name={verPrueba ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Tarjetas de prueba (pagos simulados)</Text>
      </AnimatedPressable>
      {verPrueba ? (
        <View style={[styles.prueba, { borderColor: colors.border }]}>
          {DE_PRUEBA.map((p) => (
            <AnimatedPressable
              key={p.numero}
              haptic={false}
              onPress={() => setNumero(agrupar(p.numero.replace(/\D/g, '')))}
              style={styles.pruebaFila}>
              <Text style={[styles.pruebaNumero, { color: colors.text }]}>{p.numero}</Text>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>{p.texto}</Text>
            </AnimatedPressable>
          ))}
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Cualquier nombre, una fecha futura y CVC de 3 dígitos (4 en American Express).
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function Opcion({
  titulo,
  nota,
  activa,
  disabled,
  onPress,
}: {
  titulo: string;
  nota?: string;
  activa: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors, brand } = useTheme();
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      haptic={false}
      scaleTo={0.98}
      style={[
        styles.opcion,
        { borderColor: activa ? brand.primary : colors.border, opacity: disabled ? 0.45 : 1 },
      ]}>
      <Ionicons name={activa ? 'radio-button-on' : 'radio-button-off'} size={18} color={activa ? brand.primary : colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.opcionTexto, { color: colors.text }]}>{titulo}</Text>
        {nota ? <Text style={[styles.meta, { color: colors.textSecondary }]}>{nota}</Text> : null}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  dosColumnas: { flexDirection: 'row', gap: Spacing.md },
  marcaDetectada: { flexDirection: 'row', marginTop: -Spacing.xs },
  meta: { fontSize: 12, lineHeight: 16 },
  enlace: { fontFamily: FontFamily.semiBold, fontSize: 13 },
  subtitulo: { fontFamily: FontFamily.semiBold, fontSize: 14 },
  lista: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  listaTitulo: { fontFamily: FontFamily.semiBold, fontSize: 13.5 },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md },
  opcionTexto: { fontFamily: FontFamily.medium, fontSize: 13.5 },
  pruebaBoton: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' },
  prueba: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  pruebaFila: { gap: 1 },
  pruebaNumero: { fontFamily: FontFamily.semiBold, fontSize: 13, letterSpacing: 0.5 },
});
