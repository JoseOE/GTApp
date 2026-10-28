import { API_BASE_URL, request } from './api';

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

// ─── Reseñas ───
// Califica quien compró y pagó el producto: una reseña por persona y producto,
// editable. Los planes (membresías) no llevan reseñas.

export type Resena = {
  id: string;
  autor: string;
  estrellas: number;
  comentario: string | null;
  fecha: string;
  editada: boolean;
  propia: boolean;
  // Solo en la propia: el gimnasio puede ocultarla de la tienda.
  oculta?: boolean;
};

export type MiResena = { puede: boolean; resena: Resena | null };

export type ResenasProducto = {
  calificacion: Calificacion & { porEstrellas: Record<string, number> };
  resenas: Resena[];
  hayMas: boolean;
  mia: MiResena;
};

// Carrusel "Lo mejor calificado": productos con promedio mayor a 3.8.
export type Destacado = Producto & {
  calificacion: Calificacion;
  resena: { autor: string; estrellas: number; comentario: string } | null;
};

export const MAX_COMENTARIO = 500;

export function fetchResenas(gymId: string, productoId: string, pagina = 0) {
  return request<ResenasProducto>(`/api/tienda/${gymId}/productos/${productoId}/resenas?pagina=${pagina}`);
}

export function guardarResena(gymId: string, productoId: string, estrellas: number, comentario: string) {
  return request<MiResena>(`/api/tienda/${gymId}/productos/${productoId}/resenas/mia`, {
    method: 'PUT',
    body: JSON.stringify({ estrellas, comentario }),
  });
}

export function borrarResena(gymId: string, productoId: string) {
  return request<MiResena>(`/api/tienda/${gymId}/productos/${productoId}/resenas/mia`, { method: 'DELETE' });
}

// Lo más vendido del gimnasio (piezas pagadas, sin planes), para el carrusel de la tienda.
export type MasVendido = Producto & { vendidos: number };

export function fetchMasVendidos(gymId: string, limite = 8) {
  return request<MasVendido[]>(`/api/tienda/${gymId}/productos/mas-vendidos?limite=${limite}`);
}

export function fetchDestacados(gymId: string) {
  return request<Destacado[]>(`/api/tienda/${gymId}/resenas/destacadas`);
}

// ─── Pedidos ───

export type EstadoPedido = 'pendiente_pago' | 'pagado' | 'cancelado' | 'reembolsado';

export type Pedido = {
  orderId: string;
  folio: number;
  estado: EstadoPedido;
  estadoTexto: string;
  metodo: string;
  detallePago: string | null;
  // "efectivo en tiendas": la ficha para pagar en OXXO y demás.
  paynet: {
    referencia: string;
    vence: string;
    tienda?: string | null;
    tiendaNombre?: string | null;
    folioCaja?: string | null;
    // La ficha oficial de Paynet en PDF (la genera Openpay).
    fichaUrl?: string | null;
    prueba?: boolean;
  } | null;
  proveedorPago: string;
  canal: string;
  total: number;
  subtotal: number;
  iva: number;
  creadoEn: string;
  pagadoEn: string | null;
  canceladoEn: string | null;
  // Recoger en recepción: "pendiente" (por recoger), "entregado" o "no_aplica".
  entrega: { estado: 'pendiente' | 'entregado' | 'no_aplica'; entregadoEn: string | null };
  partidas: {
    productoId: string;
    titulo: string;
    variante: string | null;
    tipo: 'producto' | 'membresia';
    cantidad: number;
    precioUnitario: number;
    total: number;
  }[];
  gym: { id: string; nombre: string; direccion: string } | null;
};

export function fetchPedidos() {
  return request<Pedido[]>('/api/tienda/pedidos');
}

export function fetchPedido(orderId: string) {
  return request<Pedido>(`/api/tienda/pedidos/${orderId}`);
}

// Rutas de las imágenes protegidas: se piden con los encabezados de la sesión.
export const rutaQrPedido = (orderId: string) => `/api/recibos/pedidos/${orderId}/qr.png`;

// ─── Pago ───

// Quién vende: los datos públicos del gimnasio (razón social, RFC...), que se
// muestran en "¿Confirmas tu compra?".
export type Vendedor = {
  id: string;
  nombre: string;
  razonSocial?: string | null;
  rfc?: string | null;
  correoContacto?: string | null;
  direccion?: string | null;
  telefono?: string | null;
};

export function fetchVendedor(gymId: string) {
  return request<Vendedor>(`/api/gyms/${gymId}`);
}

// Versión vigente de los términos de compra (Legal.VERSION en GTWeb). Si el
// servidor responde 409 "Los términos de compra cambiaron", hay que volver a
// mostrarlos y aceptarlos.
export const TERMINOS_VERSION = '1';

export const urlTerminos = (gymId: string) => `${API_BASE_URL}/terminos.html?gym=${encodeURIComponent(gymId)}`;
export const urlPrivacidad = (gymId: string) => `${API_BASE_URL}/privacidad.html?gym=${encodeURIComponent(gymId)}`;

export type Consentimiento = {
  terminosVersion: string;
  aceptaTerminos: boolean;
  // true solo si se mostró y se aceptó la advertencia sanitaria.
  aceptaAdvertencia: boolean;
};

export type MetodoPago = 'stripe' | 'paynet' | 'paypal';

//  - 200 → el pedido;
//  - 400 → falta aceptar algo (el mensaje se muestra tal cual);
//  - 402 → Stripe o PayPal rechazaron el pago;
//  - 409 → el carrito cambió ("avisos" y "carrito" corregido) o los términos cambiaron.
export function pagarCarrito(metodo: MetodoPago, datos: Record<string, unknown>, totalVisto: number, consentimiento: Consentimiento) {
  return request<Pedido>(`/api/tienda/carrito/checkout?${CANAL}`, {
    method: 'POST',
    body: JSON.stringify({ metodo, datos, totalVisto, consentimiento }),
  });
}

// ─── Tarjeta: Stripe Checkout (modo de prueba) ───

// La página de pago de Stripe por el total del carrito. La tarjeta se captura
// ahí (nunca pasa por la app ni por GymTrack) y Stripe regresa a returnUrl con
// ?session_id=...; con esa sesión se cobra el carrito.
export type SesionStripe = { id: string; url: string; monto: number };

export function crearSesionStripe(returnUrl: string, cancelUrl: string) {
  return request<SesionStripe>(`/api/pagos/stripe/sesiones?${CANAL}`, {
    method: 'POST',
    body: JSON.stringify({ returnUrl, cancelUrl }),
  });
}

// ─── PayPal (sandbox) ───

export type OrdenPaypal = { id: string; monto: number; moneda: string; aprobarUrl: string };

// returnUrl/cancelUrl: los enlaces de la app a los que vuelve el navegador
// después de aprobar o cancelar en PayPal.
export function crearOrdenPaypal(returnUrl: string, cancelUrl: string) {
  return request<OrdenPaypal>(`/api/pagos/paypal/ordenes?${CANAL}`, {
    method: 'POST',
    body: JSON.stringify({ returnUrl, cancelUrl }),
  });
}
