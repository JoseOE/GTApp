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
  signOut: () => Promise<void>;
};

const AccountCtx = createContext<AccountState>({
  account: null,
  loading: true,
  error: null,
  reload: async () => {},
  signOut: async () => {},
});

// Estado de la cuenta compartido por toda la app.
// Vive en la raíz para que el color y el logo del gimnasio estén disponibles
// antes de dibujar cualquier pantalla, no solo dentro de las pestañas.
export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cargando = useRef(false);

  const reload = useCallback(async () => {
    if (cargando.current) return;
    cargando.current = true;
    try {
      const session = await getSession();
      if (!session) {
        setAccount(null);
        setError(null);
        return;
      }
      setAccount(await fetchAccount(session.userId));
      setError(null);
    } catch (err) {
      // Si la cuenta ya no existe en la base, o la sesión venció, la sesión local sobra.
      if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
        await clearSession();
        setAccount(null);
      } else {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu cuenta.');
      }
    } finally {
      cargando.current = false;
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    // Se cierra también en el servidor; si no hay red, la sesión local se va igual.
    await logoutRequest().catch(() => {});
    await clearSession();
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
      if (estado === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  return (
    <AccountCtx.Provider value={{ account, loading, error, reload, signOut }}>
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
  const { reload } = useAccount();
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
}
