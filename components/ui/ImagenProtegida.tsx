import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, StyleSheet, Text, View, type ImageStyle, type StyleProp } from 'react-native';
import { File, Paths } from 'expo-file-system';

import { FontFamily } from '@/constants/Theme';
import { useTheme } from '@/hooks/useTheme';
import { API_BASE_URL, authHeaders } from '@/lib/api';

// Imagen que solo puede ver el dueño de la sesión (el QR del pedido, el código
// de barras de la ficha): se pide con el token, igual que la API.
// version obliga a pedirla de nuevo (el servidor no la deja en caché).
//
// No se le pasan los encabezados a <Image>: en Android no siempre los manda y
// el servidor la rechaza sin que se note. Se descarga con el token (como los
// PDF) y se muestra el archivo ya bajado.
export function ImagenProtegida({
  ruta,
  style,
  version = 0,
  accessibilityLabel,
}: {
  ruta: string;
  style: StyleProp<ImageStyle>;
  version?: number;
  accessibilityLabel?: string;
}) {
  const { brand, colors } = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setUri(null);
    setFallo(false);
    descargar(ruta, version, intento)
      .then((u) => vigente && setUri(u))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [ruta, version, intento]);

  if (!uri) {
    return (
      <View style={[style as object, styles.centro]}>
        {fallo ? (
          <Pressable onPress={() => setIntento((n) => n + 1)} accessibilityRole="button" hitSlop={8}>
            <Text style={[styles.texto, { color: colors.textSecondary }]}>No se pudo cargar.</Text>
            <Text style={[styles.texto, styles.reintentar, { color: brand.primary }]}>Toca para reintentar</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={brand.primary} />
        )}
      </View>
    );
  }

  return <Image source={{ uri }} style={style} resizeMode="contain" accessibilityLabel={accessibilityLabel} />;
}

async function descargar(ruta: string, version: number, intento: number): Promise<string> {
  const url = `${API_BASE_URL}${ruta}${version ? `?v=${version}` : ''}`;
  const headers = await authHeaders();
  if (Platform.OS === 'web') {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return URL.createObjectURL(await res.blob());
  }
  // Un nombre por imagen y versión: así <Image> no muestra la anterior desde su caché.
  const nombre = `protegida-${ruta.replace(/[^A-Za-z0-9]+/g, '-')}-${version}-${intento}.png`;
  const archivo = await File.downloadFileAsync(url, new File(Paths.cache, nombre), { headers, idempotent: true });
  return archivo.uri;
}

const styles = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center' },
  texto: { fontFamily: FontFamily.regular, fontSize: 13, textAlign: 'center' },
  reintentar: { fontFamily: FontFamily.semiBold, marginTop: 4 },
});
