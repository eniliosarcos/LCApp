import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Order, OrderPage, OrderStats } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { AppConfirmDialogComponent } from '../../../shared/components/confirm-dialog/app-confirm-dialog.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
import { DashboardComponent } from './dashboard.component';

const stats: OrderStats = {
  totalOrders: 10,
  pendingOrders: 3,
  confirmedOrders: 6,
  cancelledOrders: 1,
  totalRevenue: 1200
};

const pendingOrder: Order = {
  id: 'o1',
  code: 'CAR-AAA11',
  customerName: 'Cliente web',
  items: [{ productId: 'p1', productName: 'Rosa', quantity: 2, price: 100 }],
  status: 'pending',
  total: 200,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const page = (orders: Order[]): OrderPage => ({
  orders,
  total: orders.length,
  page: 1,
  limit: 5,
  totalPages: Math.ceil(orders.length / 5)
});

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getStats', 'getOrders', 'confirmOrder', 'cancelOrder']);

    await TestBed.configureTestingModule({
      declarations: [DashboardComponent, AppConfirmDialogComponent, AppModalComponent],
      providers: [{ provide: OrderService, useValue: orderServiceSpy }]
    }).compileComponents();
  });

  it('carga métricas y las últimas 5 órdenes pendientes', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    createComponent();

    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 5, 'pending');
    expect(component.stats?.pendingOrders).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Pendientes');
    expect(fixture.nativeElement.textContent).toContain('CAR-AAA11');
  });

  it('muestra mensaje vacío cuando no hay órdenes pendientes', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay órdenes pendientes.');
  });

  it('confirma una orden y refresca el resumen', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    component.confirmOrder(pendingOrder);

    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 5, 'pending');
    expect(orderServiceSpy.getStats).toHaveBeenCalledTimes(2);
  });

  it('muestra el error de acción si confirmar falla', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(throwError(() => new Error('Stock insuficiente')));
    createComponent();

    component.confirmOrder(pendingOrder);
    fixture.detectChanges();

    expect(component.actionError).toBe('Stock insuficiente');
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente');
  });

  it('muestra el error general si falla la carga', () => {
    orderServiceSpy.getStats.and.returnValue(throwError(() => new Error('boom')));
    orderServiceSpy.getOrders.and.returnValue(of(page([])));
    createComponent();

    expect(component.error).toBeTrue();
  });

  it('confirma solo tras aceptar el diálogo', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...pendingOrder, status: 'confirmed' }));
    createComponent();

    component.requestConfirm(pendingOrder);
    fixture.detectChanges();

    expect(component.pendingAction).toEqual({ order: pendingOrder, type: 'confirm' });
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();

    component.runPendingAction();
    fixture.detectChanges();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(orderServiceSpy.getOrders).toHaveBeenCalledWith(1, 5, 'pending');
  });

  it('cancela solo tras aceptar el diálogo', () => {
    orderServiceSpy.getStats.and.returnValue(of(stats));
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
    orderServiceSpy.getStats.and.returnValue(of(stats));
    orderServiceSpy.getOrders.and.returnValue(of(page([pendingOrder])));
    createComponent();

    component.requestCancel(pendingOrder);
    component.closePendingAction();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();
  });
});
