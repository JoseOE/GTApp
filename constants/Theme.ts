// Escala de espaciado, radios y tipografía compartidos por todas las pantallas.
// Mantiene consistente el "look" de tarjetas/botones sin repetir números mágicos
// en cada archivo de estilos.

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
};

export const Shadow = {
  soft: {
    shadowColor: '#14141A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  brand: {
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 5,
  },
};

// Escala de texto de toda la app, al estilo de iOS: cada nivel trae su tamaño,
// peso, interlineado y tracking juntos. Los títulos grandes van con tracking
// negativo (las letras grandes se ven separadas) y el texto pequeño, neutro.
export const Type = {
  largeTitle: { fontFamily: FontFamily.extraBold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  headline: { fontFamily: FontFamily.semiBold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: FontFamily.medium, fontSize: 14, lineHeight: 19 },
  footnote: { fontFamily: FontFamily.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
  // Rótulo de sección ("TU SEMANA"): pequeño, en mayúsculas y abierto.
  overline: { fontFamily: FontFamily.semiBold, fontSize: 12, lineHeight: 16, letterSpacing: 0.9 },
  // Cifras deportivas: grandes, gruesas y juntas.
  stat: { fontFamily: FontFamily.extraBold, fontSize: 30, lineHeight: 34, letterSpacing: -1 },
} as const;
