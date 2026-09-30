import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ApiError, fetchAccount, type Account } from './api';
import { clearSession, getSession } from './session';

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
      // Si la cuenta ya no existe en la base, la sesión local sobra.
      if (err instanceof ApiError && err.status === 404) {
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
    await clearSession();
    setAccount(null);
  }, []);

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
