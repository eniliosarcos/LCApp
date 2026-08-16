import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Order, OrderPage } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { AppConfirmDialogComponent } from '../../../shared/components/confirm-dialog/app-confirm-dialog.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
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

const SEARCH_DEBOUNCE_MS = 300;

describe('OrdersComponent', () => {
  let fixture: ComponentFixture<OrdersComponent>;
  let component: OrdersComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let navigateSpy: jasmine.Spy;

  function createComponent(): void {
    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrders', 'confirmOrder', 'cancelOrder']);

    await TestBed.configureTestingModule({
      declarations: [OrdersComponent, AppConfirmDialogComponent, AppModalComponent, CurrencyFormatPipe],
      imports: [FormsModule, RouterTestingModule],
      providers: [{ provide: OrderService, useValue: orderServiceSpy }]
    }).compileComponents();

    navigateSpy = spyOn(TestBed.inject(Router), 'navigate');
  });

  it('carga la primera página con todos los estados y muestra las órdenes', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')])));
    createComponent();

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('CAR-AAA11');
  });

  it('muestra el badge Manual para las ventas registradas fuera de la página', () => {
    const manualOrder = { ...order('o1', 'MAN-AAA11', 'confirmed'), source: 'manual' as const };
    orderServiceSpy.getOrders.and.returnValue(of(page([manualOrder])));
    createComponent();

    const badge = fixture.nativeElement.querySelector('.source-badge');
    expect(badge).not.toBeNull();
    expect(badge.textContent).toContain('Manual');
  });

  it('no muestra el badge Manual en las órdenes web', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')])));
    createComponent();

    expect(fixture.nativeElement.querySelector('.source-badge')).toBeNull();
  });

  it('al cambiar el filtro resetea a la página 1 y recarga con el estado', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.goToPage(2);
    component.onFilterChange('pending');

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, 'pending', undefined);
    expect(component.page).toBe(1);
  });

  it('navega entre páginas y deshabilita los botones en los extremos', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')], 1, 15)));
    createComponent();

    component.nextPage();
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(2, 10, undefined, undefined);

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
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
  });

  it('cancela una orden pendiente y recarga la página', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.cancelOrder.and.returnValue(of({ ...pendingOrder, status: 'cancelled' }));
    createComponent();

    component.cancelOrder(pendingOrder);

    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
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
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.totalPages = 10;
    component.page = 5;
    expect(component.pageNumbers).toEqual([1, '…', 4, 5, 6, '…', 10]);
  });

  it('muestra el rango de la página actual', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.total = 23;
    component.page = 2;
    expect(component.rangeLabel).toBe('11–20 de 23');
  });

  it('navega al detalle al hacer click en una fila', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')])));
    createComponent();

    const row = fixture.nativeElement.querySelector('tbody tr');
    row.dispatchEvent(new Event('click'));

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/orders/detail', 'CAR-AAA11']);
  });

  it('expone el código como enlace accesible al detalle', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([order('o1', 'CAR-AAA11', 'pending')])));
    createComponent();

    const link = fixture.nativeElement.querySelector('td .order-link');
    expect(link).not.toBeNull();
    expect(link.href).toContain('/admin/orders/detail/CAR-AAA11');
  });

  it('no navega al pulsar las acciones de la fila y abre el diálogo de confirmación', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    const confirmBtn = fixture.nativeElement.querySelector('.action.confirm');
    confirmBtn.dispatchEvent(new Event('click'));

    expect(component.pendingAction).toEqual({ order: pendingOrder, type: 'confirm' });
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();

    component.runPendingAction();

    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('confirma la orden solo tras aceptar el diálogo', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    component.requestConfirm(pendingOrder);
    fixture.detectChanges();

    expect(component.pendingAction).not.toBeNull();
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();

    component.runPendingAction();
    fixture.detectChanges();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
  });

  it('cancela la orden solo tras aceptar el diálogo', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.cancelOrder.and.returnValue(of({ ...pendingOrder, status: 'cancelled' }));
    createComponent();

    component.requestCancel(pendingOrder);
    fixture.detectChanges();

    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();

    component.runPendingAction();
    fixture.detectChanges();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith('o1');
  });

  it('cierra el diálogo sin ejecutar la acción', () => {
    const pendingOrder = order('o1', 'CAR-AAA11', 'pending');
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    createComponent();

    component.requestCancel(pendingOrder);
    component.closePendingAction();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();
  });

  it('busca por código tras el debounce y resetea a la página 1', fakeAsync(() => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();
    component.page = 3;

    component.onSearchInput('CAR-ABC');
    tick(SEARCH_DEBOUNCE_MS);

    expect(component.page).toBe(1);
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, 'CAR-ABC');
  }));

  it('no dispara la búsqueda antes del debounce', fakeAsync(() => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.onSearchInput('CAR');
    tick(200);

    expect(orderServiceSpy.getOrders).not.toHaveBeenCalledWith(1, 10, undefined, 'CAR');

    tick(100);
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, 'CAR');
  }));

  it('al borrar la búsqueda recarga todas las órdenes', fakeAsync(() => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    component.onSearchInput('CAR');
    tick(SEARCH_DEBOUNCE_MS);
    component.onSearchInput('');
    tick(SEARCH_DEBOUNCE_MS);

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
  }));

  it('busca escribiendo en el input real (recibe el valor, no un evento)', fakeAsync(() => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    const input = fixture.nativeElement.querySelector('.search-input') as HTMLInputElement;
    input.value = 'CAR-XYZ';
    input.dispatchEvent(new Event('input'));
    tick(SEARCH_DEBOUNCE_MS);

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, 'CAR-XYZ');
  }));

  it('expone un input de búsqueda accesible', () => {
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    const input = fixture.nativeElement.querySelector('.search-input');
    expect(input).not.toBeNull();
    expect(input.getAttribute('aria-label')).toContain('Buscar');
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
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 10, undefined, undefined);
    expect(component.orders.length).toBe(10);
  });
});
