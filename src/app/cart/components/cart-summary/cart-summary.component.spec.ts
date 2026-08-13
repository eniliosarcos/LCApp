import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { Cart } from '../../../core/models/cart.model';
import { ContactConfig } from '../../../core/models/contact.model';
import { Order, CreateOrderRequest } from '../../../core/models/order.model';
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
  createdAt: '2026-01-01T00:00:00.000Z'
};

describe('CartSummaryComponent', () => {
  let fixture: ComponentFixture<CartSummaryComponent>;
  let component: CartSummaryComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let cartServiceSpy: jasmine.SpyObj<CartService>;
  let anchorClickSpy: jasmine.Spy;

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['createOrder']);
    cartServiceSpy = jasmine.createSpyObj('CartService', ['hasRegisteredOrder', 'registerOrder']);

    await TestBed.configureTestingModule({
      declarations: [CartSummaryComponent, AppModalComponent, CurrencyFormatPipe],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: CartService, useValue: cartServiceSpy },
        { provide: ContactService, useValue: { getContact: () => of(contactStub) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CartSummaryComponent);
    component = fixture.componentInstance;
    component.cart = { ...cartStub };
    anchorClickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.callThrough();
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('modal-lock');
  });

  it('abre el modal y redirige tras el retardo cuando ya hay orden registrada', fakeAsync(() => {
    cartServiceSpy.hasRegisteredOrder.and.returnValue(true);
    component.openContact('whatsapp');
    fixture.detectChanges();

    expect(component.redirecting).toBeTrue();
    expect(orderServiceSpy.createOrder).not.toHaveBeenCalled();
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
    component.openContact('whatsapp');
    component.openContact('instagram');

    expect(anchorClickSpy).not.toHaveBeenCalled();
    expect(component.channelName).toBe('WhatsApp');

    tick(2000);
    fixture.detectChanges();
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
  }));
});
