import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ApiError, fetchAccount, logoutRequest, type Account } from './api';
import { clearSession, getSession, onSesionVencida } from './session';

type AccountState = {
  account: Account | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // Como reload, pero no repite la llamada si la cuenta se acaba de cargar.
  refrescar: () => Promise<void>;
  // El login y el registro ya traen la cuenta completa: se usa tal cual.
  establecer: (account: Account) => void;
  signOut: () => Promise<void>;
};

const AccountCtx = createContext<AccountState>({
  account: null,
  loading: true,
  error: null,
  reload: async () => {},
  refrescar: async () => {},
  establecer: () => {},
  signOut: async () => {},
});

// Cambiar de pestaña o volver de segundo plano dentro de este tiempo no
// vuelve a pedir la cuenta: el servidor tarda segundos en cada respuesta.
const VIGENTE_MS = 5000;

// Estado de la cuenta compartido por toda la app.
// Vive en la raíz para que el color y el logo del gimnasio estén disponibles
// antes de dibujar cualquier pantalla, no solo dentro de las pestañas.
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargando = useRef<Promise<void> | null>(null);
  const cargadaEn = useRef(0);

  const establecer = useCallback((nueva: Account) => {
    // El login trae además el token: ese vive en la sesión, no en la cuenta.
    const { token: _token, ...cuenta } = nueva as Account & { token?: string };
    setAccount(cuenta);
    setError(null);
    setLoading(false);
    cargadaEn.current = Date.now();
  }, []);

  const cargar = useCallback(async () => {
    try {
      const session = await getSession();
      if (!session) {
        setAccount(null);
        setError(null);
        return;
      }
      setAccount(await fetchAccount(session.userId));
      setError(null);
      cargadaEn.current = Date.now();
    } catch (err) {
      // Si la cuenta ya no existe en la base, o la sesión venció, la sesión local sobra.
      if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
        await clearSession();
        setAccount(null);
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu cuenta.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Si ya hay una carga en curso, se espera esa en lugar de lanzar otra.
  const reload = useCallback(() => {
    if (!cargando.current) {
      cargando.current = cargar().finally(() => {
        cargando.current = null;
      });
    }
    return cargando.current;
  }, [cargar]);

  const refrescar = useCallback(async () => {
    if (Date.now() - cargadaEn.current < VIGENTE_MS) return;
    await reload();
  }, [reload]);

  const signOut = useCallback(async () => {
    // Se cierra también en el servidor; si no hay red, la sesión local se va igual.
    await logoutRequest().catch(() => {});
    await clearSession();
    cargadaEn.current = 0;
    setAccount(null);
  }, []);

  // El servidor dijo que la sesión venció (o se cerró al cambiar la contraseña
  // en otro dispositivo): la API ya borró el token, aquí se vuelve al login.
  useEffect(
    () =>
      onSesionVencida(() => {
        setAccount(null);
        setError(null);
        router.replace('/(auth)/login');
        Alert.alert('Tu sesión venció', 'Inicia sesión de nuevo para continuar.');
      }),
    []
  );

  useEffect(() => {
    reload();
    // Al volver de segundo plano se revisa otra vez: si te dieron de baja
    // mientras tenías el teléfono guardado, lo ves al retomar la app.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') refrescar();
    });
    return () => sub.remove();
  }, [reload, refrescar]);

  return (
    <AccountCtx.Provider value={{ account, loading, error, reload, refrescar, establecer, signOut }}>
      {children}
    </AccountCtx.Provider>
  );
}

export function useAccount() {
  return useContext(AccountCtx);
}

// Cada pantalla la llama para refrescar al ganar foco: así un alta o una baja
// hecha desde el panel web se refleja con solo cambiar de pestaña.
export function useAccountRefreshOnFocus() {
  const { refrescar } = useAccount();
  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [refrescar])
  );
}
