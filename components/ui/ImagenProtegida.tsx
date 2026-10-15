import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, View, type ImageStyle, type StyleProp } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { API_BASE_URL, authHeaders } from '@/lib/api';

// Imagen que solo puede ver el dueño de la sesión (el QR del pedido, el código
// de barras de la ficha): se pide con el token, igual que la API.
// version obliga a pedirla de nuevo (el servidor no la deja en caché).
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
  const { brand } = useTheme();
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    authHeaders().then(setHeaders);
  }, []);

  if (!headers) {
    return (
      <View style={[style as object, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={brand.primary} />
      </View>
    );
  }

  return (
    <Image
      key={`${ruta}-${version}`}
      source={{ uri: `${API_BASE_URL}${ruta}${version ? `?v=${version}` : ''}`, headers, cache: 'reload' }}
      style={style}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
