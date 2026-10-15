import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { ApiError, type Account } from './api';
import { useAccount } from './AccountContext';
import {
  agregarAlCarrito,
  cambiarCantidad,
  fetchCarrito,
  quitarDelCarrito,
  type Carrito,
} from './tienda';

// Compran los miembros vinculados a un gimnasio con la membresía activa o
// vencida (justo para renovarla). Con la solicitud pendiente solo pueden ver:
// es la misma regla que AccesoService.exigirComprador en el servidor.
export function puedeComprar(account: Account | null): boolean {
  return !!account && account.role === 'member' && !!account.gymId && account.membershipStatus !== 'pending';
}

type CarritoState = {
  carrito: Carrito | null;
  error: string | null;
  recargar: () => Promise<void>;
  agregar: (varianteId: string, cantidad: number) => Promise<Carrito>;
  cambiar: (partidaId: string, cantidad: number) => Promise<void>;
  quitar: (partidaId: string) => Promise<void>;
  // El checkout recibe el carrito corregido cuando algo cambió antes de pagar.
  reemplazar: (carrito: Carrito | null) => void;
};

const CarritoCtx = createContext<CarritoState | null>(null);

// El carrito vive en el servidor (es el mismo en cualquier teléfono donde
// inicies sesión); aquí solo se guarda la última copia para pintar el contador.
export function CarritoProvider({ children }: { children: ReactNode }) {
  const { account } = useAccount();
  const [carrito, setCarrito] = useState<Carrito | null>(null);
  const [error, setError] = useState<string | null>(null);
  const habilitado = puedeComprar(account);

  const recargar = useCallback(async () => {
    if (!habilitado) {
      setCarrito(null);
      return;
    }
    try {
      setCarrito(await fetchCarrito());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar tu carrito.');
    }
  }, [habilitado]);

  useEffect(() => {
    recargar();
    // Otro usuario en el mismo teléfono no hereda el carrito anterior.
  }, [recargar, account?.id, account?.gymId]);

  const agregar = useCallback(async (varianteId: string, cantidad: number) => {
    const nuevo = await agregarAlCarrito(varianteId, cantidad);
    setCarrito(nuevo);
    return nuevo;
  }, []);

  const cambiar = useCallback(async (partidaId: string, cantidad: number) => {
    setCarrito(await cambiarCantidad(partidaId, cantidad));
  }, []);

  const quitar = useCallback(async (partidaId: string) => {
    setCarrito(await quitarDelCarrito(partidaId));
  }, []);

  return (
    <CarritoCtx.Provider value={{ carrito, error, recargar, agregar, cambiar, quitar, reemplazar: setCarrito }}>
      {children}
    </CarritoCtx.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoCtx);
  if (!ctx) throw new Error('useCarrito va dentro de <CarritoProvider>.');
  return ctx;
}
