import { Badge, type BadgeTone } from '@/components/ui/Badge';
import type { Pedido } from '@/lib/tienda';

const TONO: Record<Pedido['estado'], BadgeTone> = {
  pagado: 'success',
  pendiente_pago: 'warning',
  cancelado: 'danger',
  reembolsado: 'muted',
};

export function EstadoBadge({ pedido }: { pedido: Pedido }) {
  return <Badge label={pedido.estadoTexto} tone={TONO[pedido.estado] ?? 'muted'} />;
}

// "Por recoger" mientras está pagado y no se entrega; "Entregado" después.
// Si solo lleva membresía (o no se ha pagado) no hay nada que recoger.
export function EntregaBadge({ pedido }: { pedido: Pedido }) {
  if (pedido.entrega?.estado === 'pendiente') return <Badge label="Por recoger" tone="info" icon="storefront-outline" />;
  if (pedido.entrega?.estado === 'entregado') return <Badge label="Entregado" tone="success" icon="checkmark-done-outline" />;
  return null;
}
