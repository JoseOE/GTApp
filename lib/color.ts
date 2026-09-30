// Utilidades de color para el branding por gimnasio.
//
// El gimnasio elige un color libre, así que la app no puede confiar en que sea
// legible: un amarillo claro sobre blanco no se ve. Aquí se deriva una variante
// segura para texto y se dejan intactos los colores de fondo y de texto base,
// que son los que garantizan el contraste.

export type Rgb = { r: number; g: number; b: number };

export function hexToRgb(hex: string): Rgb | null {
  const clean = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

// Luminancia relativa (WCAG). 0 = negro, 1 = blanco.
export function luminance({ r, g, b }: Rgb): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(color: Rgb, target: Rgb, amount: number): Rgb {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
  };
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

// Oscurece (o aclara, en modo oscuro) el color del gimnasio hasta que tenga
// al menos 4.5:1 contra el fondo. Es la versión que se usa para texto.
export function readableOn(color: string, background: string, minRatio = 4.5): string {
  const rgb = hexToRgb(color);
  const bg = hexToRgb(background);
  if (!rgb || !bg) return color;

  const fondoClaro = luminance(bg) > 0.5;
  const objetivo = fondoClaro ? BLACK : WHITE;

  let actual = rgb;
  for (let paso = 0; paso <= 20; paso++) {
    if (contrastRatio(actual, bg) >= minRatio) return rgbToHex(actual);
    actual = mix(rgb, objetivo, paso / 20);
  }
  return rgbToHex(actual);
}

// Blanco o negro, el que se lea mejor encima del color dado. Para el texto
// que va sobre un botón relleno con el color del gimnasio.
export function foregroundFor(color: string): string {
  const rgb = hexToRgb(color);
  if (!rgb) return '#FFFFFF';
  return contrastRatio(rgb, WHITE) >= contrastRatio(rgb, BLACK) ? '#FFFFFF' : '#111111';
}

// Versión clara del color para fondos suaves (chips, círculos de icono).
export function tint(color: string, amount = 0.12): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;
  return rgbToHex(mix(rgb, WHITE, 1 - amount));
}
