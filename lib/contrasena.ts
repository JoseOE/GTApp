// La misma regla que revisa el servidor (PasswordUtil.esSegura en GTWeb).
export const REGLA_CONTRASENA = 'Al menos 8 caracteres, con una letra, un número y un símbolo.';

export function esSegura(password: string) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);
}
