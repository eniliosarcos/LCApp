import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { CartService } from './core/services/cart.service';
import { OrderService } from './core/services/order.service';
import { OrderStatusResponse } from './core/models/order.model';

describe('AppComponent', () => {
  let cartService: jasmine.SpyObj<CartService>;
  let orderService: jasmine.SpyObj<OrderService>;

  beforeEach(async () => {
    cartService = jasmine.createSpyObj('CartService', ['getCartSnapshot', 'clearCart', 'getCount', 'getItems']);
    cartService.getCartSnapshot.and.returnValue({
      id: 'test', items: [], code: 'CAR-TEST', createdAt: ''
    });
    cartService.getCount.and.returnValue(of(0));
    cartService.getItems.and.returnValue(of([]));
    orderService = jasmine.createSpyObj('OrderService', ['getOrderStatus']);

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, NoopAnimationsModule, SharedModule],
      declarations: [AppComponent],
      providers: [
        { provide: CartService, useValue: cartService },
        { provide: OrderService, useValue: orderService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'catalog'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('catalog');
  });

  it('no limpia el carrito si no tiene orderCode', () => {
    cartService.getCartSnapshot.and.returnValue({
      id: 'test', items: [], code: 'CAR-TEST', createdAt: ''
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(cartService.clearCart).not.toHaveBeenCalled();
  });

  it('limpia el carrito si la orden está confirmada', () => {
    cartService.getCartSnapshot.and.returnValue({
      id: 'test', items: [], code: 'CAR-TEST', createdAt: '', orderCode: 'ORD-123'
    });
    orderService.getOrderStatus.and.returnValue(of({ status: 'confirmed' } as OrderStatusResponse));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(cartService.clearCart).toHaveBeenCalled();
  });

  it('limpia el carrito si la orden está cancelada', () => {
    cartService.getCartSnapshot.and.returnValue({
      id: 'test', items: [], code: 'CAR-TEST', createdAt: '', orderCode: 'ORD-456'
    });
    orderService.getOrderStatus.and.returnValue(of({ status: 'cancelled' } as OrderStatusResponse));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(cartService.clearCart).toHaveBeenCalled();
  });
});
