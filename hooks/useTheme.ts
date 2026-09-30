import { createContext, useContext } from 'react';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { foregroundFor, hexToRgb, readableOn } from '@/lib/color';

// Color de acento que impone el gimnasio del usuario. null = marca GymTrack.
export const GymBrandContext = createContext<string | null>(null);

export function useTheme() {
  const scheme = useColorScheme() ?? 'light';
  const gymColor = useContext(GymBrandContext);
  const base = Colors[scheme];

  // Solo se sustituye el acento. Fondos, superficies y color de texto se quedan
  // como están: son los que sostienen el contraste y no deben depender de lo
  // que el gimnasio haya elegido.
  const valido = gymColor && hexToRgb(gymColor) ? gymColor : null;
  if (!valido) {
    return { scheme, colors: base, brand: Colors.brand, onPrimary: '#FFFFFF', isGymBranded: false };
  }

  // Para texto sobre el fondo se usa una variante ajustada a 4.5:1; para
  // rellenos, el color tal cual, que ahí el contraste lo da el texto encima.
  const acentoLegible = readableOn(valido, base.background);

  return {
    scheme,
    colors: { ...base, tint: acentoLegible, tabIconSelected: acentoLegible },
    brand: { ...Colors.brand, primary: valido, primaryDark: acentoLegible, primaryLight: valido },
    onPrimary: foregroundFor(valido),
    isGymBranded: true,
  };
}
