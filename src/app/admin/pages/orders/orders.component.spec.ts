import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Order, OrderPage } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { OrdersComponent } from './orders.component';

const order = (id: string, code: string, status: Order['status']): Order => ({
  id,
  code,
  customerName: 'Cliente web',
  items: [{ productId: 'p1', productName: 'Rosa', quantity: 2, price: 100 }],
  status,
  total: 200,
  createdAt: '2026-01-01T00:00:00.000Z'
});

const page = (orders: Order[], pageNumber = 1, total = orders.length): OrderPage => ({
  orders,
  total,
  page: pageNumber,
  limit: 10,
  totalPages: Math.ceil(total / 10)
});

describe('OrdersComponent', () => {
  let fixture: ComponentFixture<OrdersComponent>;
  let component: OrdersComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrders', 'confirmOrder', 'cancelOrder']);

    await TestBed.configureTestingModule({
      declarations: [OrdersComponent, CurrencyFormatPipe],
      imports: [FormsModule],
      providers: [{ provide: OrderService, useValue: orderServiceSpy }]
    }).compileComponents();
  });

  it('carga la primera página con todos los estados y muestra las órdenes', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')])));
    createComponent();

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('CAR-AAA11');
  });

  it('al cambiar el filtro resetea a la página 1 y recarga con el estado', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.goToPage(2);
    component.onFilterChange('pending');

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, 'pending');
    expect(component.page).toBe(1);
  });

  it('navega entre páginas y deshabilita los botones en los extremos', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')], 1, 15)));
    createComponent();

    component.nextPage();
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(2, 10, undefined);

    component.goToPage(1);
    expect(component.page).toBe(1);

    const buttons = fixture.nativeElement.querySelectorAll('.pagination .page-btn');
    expect(buttons[0].disabled).toBeTrue();
    expect(buttons[buttons.length - 1].disabled).toBeFalse();
  });

  it('confirma una orden pendiente y recarga la página', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    component.confirmOrder(pendingOrder);

    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined);
  });

  it('cancela una orden pendiente y recarga la página', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.cancelOrder.and.returnValue(of({ ...pendingOrder, status: 'cancelled' }));
    createComponent();

    component.cancelOrder(pendingOrder);

    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined);
  });

  it('muestra el error de carga si el endpoint falla', () => {
    orderServiceSpy.getOrders.and.returnValue(throwError(() => new Error('boom')));
    createComponent();
    fixture.detectChanges();

    expect(component.errorMessage).toBe('boom');
  });

  it('muestra el error de acción si confirmar falla', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(throwError(() => new Error('No se puede confirmar')));
    createComponent();

    component.confirmOrder(pendingOrder);
    fixture.detectChanges();

    expect(component.actionError).toBe('No se puede confirmar');
    expect(fixture.nativeElement.textContent).toContain('No se puede confirmar');
  });

  it('genera ventanas de páginas con elipsis cuando hay muchas páginas', () => {
    component.totalPages = 10;
    component.page = 5;
    expect(component.pageNumbers).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('muestra el rango de la página actual', () => {
    component.total = 23;
    component.page = 2;
    expect(component.rangeLabel).toBe('11–20 de 23');
  });

  it('retrocede a la última página válida si la actual queda vacía tras una acción', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    const tenOrders = Array.from({ length: 10 }, (_v, i) => order(`o${i + 2}`, `CAR-BB${String(i + 1).padStart(2, '0')}`, 'pending'));
    orderServiceSpy.getOrders.and.returnValues(
      of(page(tenOrders, 1, 11)),
      of(page([pendingOrder], 2, 11)),
      of(page([], 2, 10)),
      of(page(tenOrders, 1, 10))
    );
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    component.goToPage(2);
    expect(component.orders.length).toBe(1);

    component.confirmOrder(pendingOrder);

    expect(component.page).toBe(1);
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined);
    expect(component.orders.length).toBe(10);
  });
});
