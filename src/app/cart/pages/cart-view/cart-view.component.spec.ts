import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Cart } from '../../../core/models/cart.model';
import { Order } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { SnackbarData, SnackbarService } from '../../../core/services/snackbar.service';
import { CartViewComponent } from './cart-view.component';

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

describe('CartViewComponent', () => {
  let component: CartViewComponent;
  let fixture: ComponentFixture<CartViewComponent>;
  let cartService: CartService;
  let snackbarService: SnackbarService;
  let orderService: jasmine.SpyObj<OrderService>;

  beforeEach(async () => {
    orderService = jasmine.createSpyObj('OrderService', ['updateOrderItems']);
    orderService.updateOrderItems.and.returnValue(of({ code: 'CAR-X' } as Order));

    await TestBed.configureTestingModule({
      declarations: [CartViewComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: OrderService, useValue: orderService }]
    }).compileComponents();

    localStorage.clear();
    cartService = TestBed.inject(CartService);
    snackbarService = TestBed.inject(SnackbarService);
    fixture = TestBed.createComponent(CartViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function currentCart(): Cart {
    let cart: Cart | null = null;
    cartService.getCart().subscribe(value => (cart = value));
    return cart as unknown as Cart;
  }

  function currentSnackbar(): SnackbarData | null {
    let data: SnackbarData | null = null;
    snackbarService.getData().subscribe(value => (data = value));
    return data;
  }

  it('vaciar el carrito muestra un aviso con acción de deshacer', () => {
    cartService.addItem(product, 2);
    component.clearCart();

    const data = currentSnackbar();
    expect(data?.message).toBe('Tu carrito fue vaciado.');
    expect(data?.actionLabel).toBe('Deshacer');
    expect(currentCart().items.length).toBe(0);
  });

  it('la acción de deshacer restaura los items del carrito', () => {
    cartService.addItem(product, 2);
    component.clearCart();

    currentSnackbar()?.onAction?.();

    expect(currentCart().items.length).toBe(1);
    expect(currentCart().items[0].productId).toBe('p1');
    expect(currentCart().items[0].quantity).toBe(2);
  });

  it('actualizar el pedido muestra un aviso de éxito', () => {
    cartService.addItem(product, 1);
    cartService.registerOrder('CAR-ABC12');
    fixture.detectChanges();

    component.updateOrder();

    expect(orderService.updateOrderItems).toHaveBeenCalledWith('CAR-ABC12', jasmine.any(Array));
    expect(currentSnackbar()?.message).toBe('Tu pedido fue actualizado.');
  });
});
