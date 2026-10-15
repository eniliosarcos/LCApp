import { itemSubtotal, itemTrackBy, orderTrackBy, paymentStatusLabel, remainingOf } from './admin-utils';

describe('admin-utils', () => {
  describe('itemSubtotal', () => {
    it('multiplica precio por cantidad', () => {
      expect(itemSubtotal({ price: 100, quantity: 2 })).toBe(200);
    });

    it('soporta precios decimales', () => {
      expect(itemSubtotal({ price: 5.5, quantity: 3 })).toBe(16.5);
    });
  });

  describe('itemTrackBy', () => {
    it('devuelve el productId del ítem', () => {
      expect(itemTrackBy(0, { productId: 'abc-123' })).toBe('abc-123');
    });
  });

  describe('orderTrackBy', () => {
    it('devuelve el id de la orden', () => {
      expect(orderTrackBy(0, { id: 'ord-1' } as never)).toBe('ord-1');
    });
  });

  describe('paymentStatusLabel', () => {
    it('traduce los estados de pago', () => {
      expect(paymentStatusLabel('unpaid')).toBe('Sin pagar');
      expect(paymentStatusLabel('partial')).toBe('Parcial');
      expect(paymentStatusLabel('paid')).toBe('Pagado');
    });

    it('deja pasar valores desconocidos', () => {
      expect(paymentStatusLabel('other' as never)).toBe('other');
    });
  });

  describe('remainingOf', () => {
    it('calcula el pendiente', () => {
      expect(remainingOf({ total: 100, amountPaid: 30 } as never)).toBe(70);
    });

    it('redondea a 2 decimales', () => {
      expect(remainingOf({ total: 100.05, amountPaid: 100 } as never)).toBe(0.05);
    });

    it('devuelve el total si no se abonó nada', () => {
      expect(remainingOf({ total: 25, amountPaid: 0 } as never)).toBe(25);
    });
  });
});