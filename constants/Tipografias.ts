import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { Oswald_700Bold } from '@expo-google-fonts/oswald';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

// Letras que el dueño elige en el panel web para el nombre de su gimnasio en
// la portada de Inicio (Gym.TIPOGRAFIAS en GTWeb, con los mismos archivos).
// escala: cada letra se ve de distinto tamaño al mismo número de puntos; con
// esto todas ocupan más o menos lo mismo.
export type Tipografia = 'poppins' | 'bebas-neue' | 'oswald' | 'anton' | 'montserrat' | 'playfair';

export const TIPOGRAFIAS: Record<Tipografia, { familia: string; escala: number; tracking: number }> = {
  poppins: { familia: 'Poppins_800ExtraBold', escala: 1, tracking: -0.8 },
  'bebas-neue': { familia: 'BebasNeue_400Regular', escala: 1.3, tracking: 0.5 },
  oswald: { familia: 'Oswald_700Bold', escala: 1.12, tracking: -0.2 },
  anton: { familia: 'Anton_400Regular', escala: 1.12, tracking: 0 },
  montserrat: { familia: 'Montserrat_800ExtraBold', escala: 0.96, tracking: -0.8 },
  playfair: { familia: 'PlayfairDisplay_700Bold', escala: 1.04, tracking: -0.4 },
};

// Para useFonts en la raíz (Poppins ExtraBold ya se carga con el resto de Poppins).
export const FUENTES_PORTADA = {
  BebasNeue_400Regular,
  Oswald_700Bold,
  Anton_400Regular,
  Montserrat_800ExtraBold,
  PlayfairDisplay_700Bold,
};

export function tipografiaDe(id: string | null | undefined) {
  return TIPOGRAFIAS[(id ?? 'poppins') as Tipografia] ?? TIPOGRAFIAS.poppins;
}
