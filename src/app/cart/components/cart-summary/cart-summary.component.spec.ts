import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { Cart } from '../../../core/models/cart.model';
import { ContactConfig } from '../../../core/models/contact.model';
import { Order, CreateOrderRequest, OrderStatusResponse } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { ContactService } from '../../../core/services/contact.service';
import { OrderService } from '../../../core/services/order.service';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CartSummaryComponent } from './cart-summary.component';

const contactStub: ContactConfig = {
  whatsapp: '521234567890',
  whatsappDisplay: '+52 123 456 7890',
  instagram: '@tu_usuario',
  telegram: '@tu_usuario'
};

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

const cartStub: Cart = {
  id: 'c1',
  items: [{ productId: 'p1', product, quantity: 2 }],
  code: 'CAR-ABC12',
  orderCode: 'CAR-ABC12',
  createdAt: '2026-01-01T00:00:00.000Z'
};

const confirmedStatus: OrderStatusResponse = {
  code: 'CAR-ABC12',
  status: 'confirmed',
  confirmedAt: '2026-01-02T00:00:00.000Z'
};

const cancelledStatus: OrderStatusResponse = {
  code: 'CAR-ABC12',
  status: 'cancelled'
};

const pendingStatus: OrderStatusResponse = {
  code: 'CAR-ABC12',
  status: 'pending'
};

describe('CartSummaryComponent', () => {
  let fixture: ComponentFixture<CartSummaryComponent>;
  let component: CartSummaryComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let routerSpy: jasmine.SpyObj<Router>;
  let anchorClickSpy: jasmine.Spy;

  function createComponent(): void {
    fixture = TestBed.createComponent(CartSummaryComponent);
    component = fixture.componentInstance;
    component.cart = { ...cartStub };
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['createOrder', 'getOrderStatus', 'updateOrderItems']);
    cartServiceSpy = jasmine.createSpyObj('CartService', [
      'hasRegisteredOrder',
      'hasModifiedOrder',
      'registerOrder',
      'clearOrderCode',
      'clearCart',
      'markOrderSynced'
    ]);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [CartSummaryComponent, AppModalComponent, CurrencyFormatPipe],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: ContactService, useValue: { getContact: () => of(contactStub) } },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    anchorClickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.callThrough();
    createComponent();
  });

  afterEach(() => {
    document.body.classList.remove('modal-lock');
  });

  it('abre el modal y redirige tras el retardo cuando ya hay orden registrada y no fue modificada', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    cartServiceSpy.hasModifiedOrder.and.returnValue(false);
    component.openContact('whatsapp');
    fixture.detectChanges();

    expect(component.redirecting).toBeTrue();
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.updateOrderItems).not.toHaveBeenCalled();
    expect(document.body.classList.contains('modal-lock')).toBeTrue();

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(component.redirecting).toBeFalse();
    expect(document.body.classList.contains('modal-lock')).toBeFalse();
  }));

  it('registra la orden en el endpoint y luego redirige tras el retardo', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(false);
    const pending = new Subject<Order>();
    orderServiceSpy.createOrder.and.returnValue(pending.asObservable());

    component.openContact('instagram');
    fixture.detectChanges();

    expect(component.redirecting).toBeTrue();
    expect(component.contacting).toBeTrue();
    expect(orderServiceSpy.createOrder).toHaveBeenCalledWith(jasmine.objectContaining<CreateOrderRequest>({
      items: [{ productId: 'p1', productName: 'Rosa', quantity: 2, price: 100 }]
    }));

    tick(2000);
    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.redirecting).toBeTrue();

    pending.next({ id: 'o1', code: 'CAR-ABC12', customerName: 'Cliente web', items: [], status: 'pending', total: 200, createdAt: '2026-01-01T00:00:00.000Z' });
    pending.complete();
    fixture.detectChanges();

    expect(component.contacting).toBeFalse();
    expect(cartServiceSpy.registerOrder).toHaveBeenCalledWith('CAR-ABC12');
    expect(component.registered).toBeTrue();

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(component.redirecting).toBeFalse();
  }));

  it('no redirige y muestra error si el endpoint falla', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(false);
    const pending = new Subject<Order>();
    orderServiceSpy.createOrder.and.returnValue(pending.asObservable());

    component.openContact('telegram');
    fixture.detectChanges();

    expect(component.redirecting).toBeTrue();

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.redirecting).toBeTrue();

    pending.error(new Error('boom'));
    fixture.detectChanges();
    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.redirecting).toBeFalse();
    expect(component.contacting).toBeFalse();
    expect(component.errorMessage).toContain('No se pudo registrar tu pedido');
  }));

  it('ignora clicks repetidos mientras redirige', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    cartServiceSpy.hasModifiedOrder.and.returnValue(false);
    component.openContact('whatsapp');
    component.openContact('instagram');

    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.channelName).toBe('WhatsApp');

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  }));

  it('actualiza la orden pendiente y redirige cuando el carrito fue modificado', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    cartServiceSpy.hasModifiedOrder.and.returnValue(true);
    const pending = new Subject<Order>();
    orderServiceSpy.updateOrderItems.and.returnValue(pending.asObservable());

    component.openContact('whatsapp');
    fixture.detectChanges();

    expect(component.redirecting).toBeTrue();
    expect(orderServiceSpy.updateOrderItems).toHaveBeenCalledWith('CAR-ABC12', [
      { productId: 'p1', productName: 'Rosa', quantity: 2, price: 100 }
    ]);
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.redirecting).toBeTrue();

    pending.next({ id: 'o1', code: 'CAR-ABC12', customerName: 'Cliente web', items: [], status: 'pending', total: 200, createdAt: '2026-01-01T00:00:00.000Z' });
    pending.complete();
    fixture.detectChanges();

    expect(cartServiceSpy.markOrderSynced).toHaveBeenCalledTimes(1);

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(component.redirecting).toBeFalse();
  }));

  it('no actualiza la orden cuando el carrito no fue modificado', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    cartServiceSpy.hasModifiedOrder.and.returnValue(false);

    component.openContact('whatsapp');
    fixture.detectChanges();

    expect(orderServiceSpy.updateOrderItems).not.toHaveBeenCalled();
    expect(component.redirecting).toBeTrue();

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalled();
    expect(component.redirecting).toBeFalse();
  }));

  it('re-verifica el estado si la actualización de la orden falla', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    cartServiceSpy.hasModifiedOrder.and.returnValue(true);
    const patch$ = new Subject<Order>();
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.updateOrderItems.and.returnValue(patch$.asObservable());
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    component.openContact('whatsapp');
    fixture.detectChanges();
    expect(component.redirecting).toBeTrue();

    patch$.error(Object.assign(new Error('No se puede actualizar una orden confirmada'), { status: 400 }));
    fixture.detectChanges();

    expect(component.redirecting).toBeFalse();
    expect(component.checkingOrder).toBeTrue();
    expect(orderServiceSpy.getOrderStatus).toHaveBeenCalledWith('CAR-ABC12');

    status$.next(confirmedStatus);
    status$.complete();
    fixture.detectChanges();

    expect(component.orderConfirmed).toBeTrue();
    expect(cartServiceSpy.markOrderSynced).not.toHaveBeenCalled();

    tick(4000);
    fixture.detectChanges();
  }));

  it('consulta el estado al volver y muestra el pedido registrado si sigue pending', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    createComponent();
    expect(component.checkingOrder).toBeTrue();
    expect(component.orderConfirmed).toBeFalse();

    status$.next(pendingStatus);
    status$.complete();
    fixture.detectChanges();

    expect(component.checkingOrder).toBeFalse();
    expect(component.registered).toBeTrue();
    expect(component.orderConfirmed).toBeFalse();
    expect(component.orderNotice).toBe('');
  }));

  it('vacía el carrito y redirige al inicio cuando la orden fue confirmada', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    createComponent();
    status$.next(confirmedStatus);
    status$.complete();
    fixture.detectChanges();

    expect(component.orderConfirmed).toBeTrue();
    expect(cartServiceSpy.clearCart).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();

    tick(4000);
    fixture.detectChanges();

    expect(cartServiceSpy.clearCart).toHaveBeenCalledTimes(1);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
  }));

  it('limpia solo el código y muestra aviso cuando la orden fue cancelada', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    createComponent();
    status$.next(cancelledStatus);
    status$.complete();
    fixture.detectChanges();
    tick();

    expect(cartServiceSpy.clearOrderCode).toHaveBeenCalledTimes(1);
    expect(cartServiceSpy.clearCart).not.toHaveBeenCalled();
    expect(component.registered).toBeFalse();
    expect(component.orderNotice).toContain('Tu pedido fue cancelado');
    expect(component.orderNoticeTitle).toBe('Pedido cancelado');
    expect(document.body.classList.contains('modal-lock')).toBeTrue();

    component.closeNotice();
    fixture.detectChanges();
    tick();

    expect(component.orderNotice).toBe('');
    expect(document.body.classList.contains('modal-lock')).toBeFalse();
  }));

  it('limpia solo el código y muestra aviso si la orden no existe (404)', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    createComponent();
    status$.error(Object.assign(new Error('Orden no encontrada'), { status: 404 }));
    fixture.detectChanges();
    tick();

    expect(cartServiceSpy.clearOrderCode).toHaveBeenCalledTimes(1);
    expect(cartServiceSpy.clearCart).not.toHaveBeenCalled();
    expect(component.registered).toBeFalse();
    expect(component.orderNotice).toContain('Ya no encontramos tu pedido');
    expect(component.orderNoticeTitle).toBe('Pedido no encontrado');
    expect(document.body.classList.contains('modal-lock')).toBeTrue();
  }));

  it('mantiene el estado registrado sin aviso si el estado no se puede verificar (error de red)', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    const status$ = new Subject<OrderStatusResponse>();
    orderServiceSpy.getOrderStatus.and.returnValue(status$.asObservable());

    createComponent();
    status$.error(new Error('network down'));
    fixture.detectChanges();

    expect(cartServiceSpy.clearOrderCode).not.toHaveBeenCalled();
    expect(cartServiceSpy.clearCart).not.toHaveBeenCalled();
    expect(component.registered).toBeTrue();
    expect(component.orderConfirmed).toBeFalse();
    expect(component.orderNotice).toBe('');
  }));
});
