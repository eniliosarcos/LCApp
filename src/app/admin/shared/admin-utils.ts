import { Order, PaymentStatus } from '../../core/models/order.model';

export function itemSubtotal(item: { price: number; quantity: number }): number {
  return item.price * item.quantity;
}

export function itemTrackBy(_index: number, item: { productId: string }): string {
  return item.productId;
}

export function orderTrackBy(_index: number, order: Order): string {
  return order.id;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'unpaid': return 'Sin pagar';
    case 'partial': return 'Parcial';
    case 'paid': return 'Pagado';
    default: return status;
  }
}

export function remainingOf(order: Order): number {
  return Math.round((order.total - order.amountPaid) * 100) / 100;
}