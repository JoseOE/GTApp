// La misma regla que revisa el servidor (PasswordUtil.esSegura en GTWeb).
export const REGLA_CONTRASENA = 'Al menos 8 caracteres, con una letra, un número y un símbolo.';

export function esSegura(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}

// "Más tarde" en la contraseña temporal de recepción: no se vuelve a pedir
// mientras la app siga abierta (sirve para probar rápido sin un correo real).
// Al abrirla otra vez se pide de nuevo, y Mi cuenta la sigue marcando.
const pospuestas = new Set<string>();

export function posponerTemporal(userId: string) {
  pospuestas.add(userId);
}

export function temporalPospuesta(userId: string | undefined) {
  return !!userId && pospuestas.has(userId);
}
