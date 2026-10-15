import { request } from './api';

// La tienda del gimnasio, desde la app. El servidor es GTWeb: estas son las
// mismas rutas que usa la tienda de la página, con ?canal=app en el carrito
// para que el de la app sea independiente del de la web.
const CANAL = 'canal=app';

export type Calificacion = { promedio: number; total: number };

export type Variante = {
  id: string;
  nombre: string;
  presentacion?: string | null;
  sabor?: string | null;
  precio: number;
  controlarInventario: boolean;
  disponible: number | null;
  agotado: boolean;
};

export type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen: string | null;
  tipo: 'producto' | 'membresia';
  categoria: { handle: string; nombre: string } | null;
  // Quién lo fabrica y quién lo surte (se muestra antes de comprar).
  marca?: string | null;
  proveedor?: string | null;
  sitioProveedor?: string | null;
  // Suplementos: piden aceptar la advertencia sanitaria antes de pagar.
  requiereAdvertencia: boolean;
  calificacion: Calificacion | null;
  variantes: Variante[];
  precioDesde: number | null;
  agotado: boolean;
  plan: {
    pagoUnico: boolean;
    duracionTexto: string;
    beneficios: string[];
    destacado: boolean;
  } | null;
};

export type Categoria = { handle: string; nombre: string };

export type PartidaCarrito = {
  id: string;
  varianteId: string;
  productoId: string;
  titulo: string;
  variante: string | null;
  imagen: string | null;
  esPlan: boolean;
  requiereAdvertencia: boolean;
  cantidad: number;
  maximo: number;
  precioUnitario: number;
  total: number;
};

export type Carrito = {
  id: string | null;
  gymId: string;
  items: PartidaCarrito[];
  articulos: number;
  subtotal: number;
  iva: number;
  total: number;
  // Lo que el servidor corrigió (precio, existencias) desde la última vez.
  avisos: string[];
};

// ─── Catálogo ───

export function fetchProductos(gymId: string, filtros: { categoria?: string; q?: string } = {}) {
  // A mano: el URLSearchParams de React Native no implementa todos sus métodos.
  const params: string[] = [];
  if (filtros.categoria) params.push(`categoria=${encodeURIComponent(filtros.categoria)}`);
  if (filtros.q?.trim()) params.push(`q=${encodeURIComponent(filtros.q.trim())}`);
  const qs = params.join('&');
  return request<Producto[]>(`/api/tienda/${gymId}/productos${qs ? `?${qs}` : ''}`);
}

export function fetchProducto(gymId: string, productoId: string) {
  return request<Producto>(`/api/tienda/${gymId}/productos/${productoId}`);
}

export function fetchCategorias() {
  return request<Categoria[]>('/api/tienda/categorias');
}

// ─── Carrito ───

export function fetchCarrito() {
  return request<Carrito>(`/api/tienda/carrito?${CANAL}`);
}

export function agregarAlCarrito(varianteId: string, cantidad: number) {
  return request<Carrito>(`/api/tienda/carrito/items?${CANAL}`, {
    method: 'POST',
    body: JSON.stringify({ varianteId, cantidad }),
  });
}

// cantidad 0 quita la partida.
export function cambiarCantidad(partidaId: string, cantidad: number) {
  return request<Carrito>(`/api/tienda/carrito/items/${partidaId}?${CANAL}`, {
    method: 'PATCH',
    body: JSON.stringify({ cantidad }),
  });
}

export function quitarDelCarrito(partidaId: string) {
  return request<Carrito>(`/api/tienda/carrito/items/${partidaId}?${CANAL}`, { method: 'DELETE' });
}

export function vaciarCarrito() {
  return request<Carrito>(`/api/tienda/carrito?${CANAL}`, { method: 'DELETE' });
}
