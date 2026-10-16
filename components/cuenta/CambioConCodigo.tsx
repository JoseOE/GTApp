import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ErrorBox, Field } from '@/components/ui/Field';
import { FontFamily, Spacing } from '@/constants/Theme';
import { ApiError, cambiarContrasenaConCodigo, pedirCodigoContrasena } from '@/lib/api';
import { esSegura, REGLA_CONTRASENA } from '@/lib/contrasena';

// El servidor deja pedir otro código cada 60 segundos.
const ESPERA_REENVIO = 60;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cambiar la contraseña con un código que llega al correo, en dos pasos:
// pedir el código y luego escribirlo junto con la contraseña nueva.
//  - emailFijo: con sesión (Mi cuenta, contraseña temporal) va al correo de la cuenta.
//  - sin emailFijo: "¿Olvidaste tu contraseña?", la persona escribe su correo.
export function CambioConCodigo({
  emailFijo,
  emailInicial = '',
  onListo,
}: {
  emailFijo?: string;
  emailInicial?: string;
  onListo: (email: string, mensaje: string) => void;
}) {
  const { colors, brand } = useTheme();
  const [email, setEmail] = useState(emailFijo ?? emailInicial);
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [ver, setVer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo() {
    const correo = (emailFijo ?? email).trim();
    if (!CORREO_VALIDO.test(correo)) {
      setError('Escribe el correo con el que creaste tu cuenta.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await pedirCodigoContrasena(correo);
      setEnviado(true);
      setCodigo('');
      setEspera(ESPERA_REENVIO);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar el código. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function cambiar() {
    const correo = (emailFijo ?? email).trim();
    if (!/^\d{6}$/.test(codigo)) {
      setError('Escribe el código de 6 dígitos que te llegó al correo.');
      return;
    }
    if (!esSegura(nueva)) {
      setError(`La contraseña nueva no es segura. ${REGLA_CONTRASENA}`);
      return;
    }
    if (nueva !== confirmar) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { message } = await cambiarContrasenaConCodigo(correo, codigo, nueva);
      onListo(correo, message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar tu contraseña.');
    } finally {
      setLoading(false);
    }
  }

  if (!enviado) {
    return (
      <View style={styles.form}>
        {emailFijo ? (
          <Text style={[styles.texto, { color: colors.textSecondary }]}>
            Te mandaremos un código de 6 dígitos a{' '}
            <Text style={{ color: colors.text, fontFamily: FontFamily.semiBold }}>{emailFijo}</Text> para confirmar
            que eres tú.
          </Text>
        ) : (
          <Field
            label="Correo electrónico"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="ejemplo@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="send"
            onSubmitEditing={enviarCodigo}
          />
        )}
        {error ? <ErrorBox message={error} /> : null}
        <PrimaryButton label="Enviarme el código" icon="mail-outline" onPress={enviarCodigo} loading={loading} />
      </View>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={[styles.texto, { color: colors.textSecondary }]}>
        Si hay una cuenta con{' '}
        <Text style={{ color: colors.text, fontFamily: FontFamily.semiBold }}>{(emailFijo ?? email).trim()}</Text>, te
        enviamos un código. Revisa también spam o promociones; vence en 30 minutos.
      </Text>
      <Field
        label="Código de 6 dígitos"
        icon="keypad-outline"
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      <Field
        label="Contraseña nueva"
        icon="lock-closed-outline"
        value={nueva}
        onChangeText={setNueva}
        secureTextEntry={!ver}
        autoCapitalize="none"
        rightIcon={ver ? 'eye-off-outline' : 'eye-outline'}
        onRightIconPress={() => setVer((v) => !v)}
        hint={REGLA_CONTRASENA}
      />
      <Field
        label="Confirma la contraseña nueva"
        icon="checkmark-done-outline"
        value={confirmar}
        onChangeText={setConfirmar}
        secureTextEntry={!ver}
        autoCapitalize="none"
      />
      {error ? <ErrorBox message={error} /> : null}
      <PrimaryButton label="Cambiar contraseña" icon="save-outline" onPress={cambiar} loading={loading} />

      <AnimatedPressable onPress={enviarCodigo} disabled={espera > 0 || loading} haptic={false} style={styles.enlace}>
        <Text style={[styles.enlaceTexto, { color: espera > 0 ? colors.textSecondary : brand.primary }]}>
          {espera > 0 ? `¿No llegó? Pide otro en ${espera} s` : '¿No llegó? Enviar otro código'}
        </Text>
      </AnimatedPressable>
      {!emailFijo ? (
        <AnimatedPressable
          onPress={() => {
            setEnviado(false);
            setError(null);
          }}
          haptic={false}
          style={styles.enlace}>
          <Text style={[styles.enlaceTexto, { color: colors.textSecondary }]}>Usar otro correo</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.lg },
  texto: { fontSize: 13.5, lineHeight: 19 },
  enlace: { alignSelf: 'center', paddingVertical: Spacing.xs },
  enlaceTexto: { fontFamily: FontFamily.medium, fontSize: 13.5, textAlign: 'center' },
});
