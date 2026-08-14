import { TestBed } from '@angular/core/testing';
import { Cart, CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';
import { CartService } from './cart.service';

const product: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'Rosa',
  slug: 'rosa',
  description: 'Rosa roja',
  price: 100,
  stock: 10,
  sku: 'ROSA-1',
  images: [],
  tags: [],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const discountProduct: Product = {
  ...product,
  id: 'p2',
  price: 200,
  discountPrice: 150
};

describe('CartService', () => {
  let service: CartService;

  function currentCart(): Cart {
    let cart: Cart | null = null;
    service.getCart().subscribe(value => (cart = value));
    return cart as unknown as Cart;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('se crea un carrito vacío sin orden registrada', () => {
    const cart = currentCart();
    expect(cart.items.length).toBe(0);
    expect(cart.orderCode).toBeUndefined();
    expect(cart.orderModified).toBeUndefined();
    expect(service.hasRegisteredOrder()).toBeFalse();
    expect(service.hasModifiedOrder()).toBeFalse();
  });

  it('persiste el carrito en localStorage', () => {
    service.addItem(product, 2);
    const raw = localStorage.getItem('catalog_cart');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw as string) as Cart;
    expect(stored.items.length).toBe(1);
    expect(stored.items[0].quantity).toBe(2);
  });

  it('marca la orden como modificada al agregar un item cuando hay orden registrada', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');

    expect(service.hasModifiedOrder()).toBeFalse();

    service.addItem(discountProduct, 3);

    expect(service.hasModifiedOrder()).toBeTrue();
    expect(currentCart().orderModified).toBeTrue();
  });

  it('no marca la orden como modificada al agregar un item sin orden registrada', () => {
    service.addItem(product, 1);

    expect(service.hasModifiedOrder()).toBeFalse();
    expect(currentCart().orderModified).toBeUndefined();
  });

  it('marca la orden como modificada al actualizar la cantidad', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');

    service.updateQuantity('p1', 5);

    expect(service.hasModifiedOrder()).toBeTrue();
  });

  it('marca la orden como modificada al quitar un item', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');

    service.removeItem('p1');

    expect(service.hasModifiedOrder()).toBeTrue();
  });

  it('marca la orden como modificada al reducir la cantidad a cero', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');

    service.updateQuantity('p1', 0);

    expect(service.hasModifiedOrder()).toBeTrue();
    expect(currentCart().items.length).toBe(0);
  });

  it('registerOrder deja la orden como sincronizada', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');
    service.updateQuantity('p1', 3);

    expect(service.hasModifiedOrder()).toBeTrue();

    service.registerOrder('CAR-XYZ99');

    expect(service.hasModifiedOrder()).toBeFalse();
    expect(service.hasRegisteredOrder()).toBeTrue();
  });

  it('markOrderSynced resetea la bandera de modificación', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');
    service.updateQuantity('p1', 2);

    service.markOrderSynced();

    expect(service.hasModifiedOrder()).toBeFalse();
    expect(currentCart().orderModified).toBeFalse();
  });

  it('clearOrderCode limpia el código y la bandera', () => {
    service.addItem(product, 1);
    service.registerOrder('CAR-ABC12');
    service.updateQuantity('p1', 2);

    service.clearOrderCode();

    expect(service.hasRegisteredOrder()).toBeFalse();
    expect(service.hasModifiedOrder()).toBeFalse();
    expect(currentCart().orderCode).toBeUndefined();
    expect(currentCart().orderModified).toBeFalse();
  });

  it('clearOrderCode no emite si no hay orden registrada', () => {
    let emissions = 0;
    service.getCart().subscribe(() => emissions++);

    service.clearOrderCode();

    expect(emissions).toBe(1);
  });

  it('restoreCart restaura items y orden registrada tras vaciar', () => {
    service.addItem(product, 2);
    service.registerOrder('CAR-ABC12');
    const snapshot = currentCart();

    service.clearCart();

    expect(service.hasRegisteredOrder()).toBeFalse();
    expect(currentCart().items.length).toBe(0);

    service.restoreCart(snapshot);

    expect(currentCart().items.length).toBe(1);
    expect(currentCart().items[0].quantity).toBe(2);
    expect(currentCart().orderCode).toBe('CAR-ABC12');
    expect(service.hasRegisteredOrder()).toBeTrue();
  });

  it('getTotal usa el precio con descuento', () => {
    service.addItem(product, 2);
    service.addItem(discountProduct, 1);

    let total = 0;
    service.getTotal().subscribe(value => (total = value));

    expect(total).toBe(350);
  });

  it('calcula el total con los items correctos', () => {
    service.addItem(product, 2);

    let items: CartItem[] = [];
    service.getItems().subscribe(value => (items = value));

    expect(items.length).toBe(1);
    expect(items[0].productId).toBe('p1');
  });
});
