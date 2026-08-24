import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { AppConfirmDialogComponent } from '../../../shared/components/confirm-dialog/app-confirm-dialog.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
import { OrderDetailComponent } from './order-detail.component';

const order: Order = {
  id: 'o1',
  code: 'CAR-ABC12',
  customerName: 'Cliente web',
  customerPhone: '521234567890',
  items: [
    { productId: 'p1', productName: 'Rosa', quantity: 2, price: 100 },
    { productId: 'p2', productName: 'Girasol', quantity: 1, price: 150 }
  ],
  status: 'pending',
  total: 350,
  paymentStatus: 'not_applicable',
  amountPaid: 0,
  payments: [],
  createdAt: '2026-01-01T00:00:00.000Z'
};

describe('OrderDetailComponent', () => {
  let fixture: ComponentFixture<OrderDetailComponent>;
  let component: OrderDetailComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  const routeStub = { snapshot: { paramMap: { get: () => 'CAR-ABC12' } } };

  function createComponent(): void {
    fixture = TestBed.createComponent(OrderDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrderByCode', 'confirmOrder', 'cancelOrder']);

    await TestBed.configureTestingModule({
      declarations: [OrderDetailComponent, AppConfirmDialogComponent, AppModalComponent],
      imports: [RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: OrderService, useValue: orderServiceSpy }
      ]
    }).compileComponents();
  });

  it('carga la orden por código y muestra sus datos', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    expect(orderServiceSpy.getOrderByCode).toHaveBeenCalledWith('CAR-ABC12');
    expect(component.order?.code).toBe('CAR-ABC12');

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Cliente web');
    expect(text).toContain('521234567890');
    expect(text).toContain('Rosa');
    expect(text).toContain('Girasol');
    expect(text).toContain('$350');
    expect(text).toContain('pending');
  });

  it('muestra los subtotales por línea y el total', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    const cells = fixture.nativeElement.querySelectorAll('.items-table tbody tr td');
    expect(cells[3].textContent).toContain('$200');
    expect(cells[7].textContent).toContain('$150');
    expect(component.itemSubtotal({ price: 100, quantity: 2 })).toBe(200);
  });

  it('muestra guión en teléfono y confirmada cuando no existen', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of({ ...order, customerPhone: undefined, confirmedAt: undefined }));
    createComponent();

    const dds = Array.from(fixture.nativeElement.querySelectorAll('.info-grid dd')) as HTMLElement[];
    const values = dds.map(dd => dd.textContent?.trim());
    expect(values.filter(v => v === '-').length).toBe(2);
  });

  it('confirma la orden y actualiza el estado', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...order, status: 'confirmed', confirmedAt: '2026-01-02T00:00:00.000Z' }));
    createComponent();

    component.confirmOrder();
    fixture.detectChanges();

    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(component.order?.status).toBe('confirmed');
  });

  it('muestra el error de acción si confirmar falla', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.confirmOrder.and.returnValue(throwError(() => new Error('Stock insuficiente')));
    createComponent();

    component.confirmOrder();
    fixture.detectChanges();

    expect(component.actionError).toBe('Stock insuficiente');
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente');
  });

  it('confirma solo tras aceptar el diálogo', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.confirmOrder.and.returnValue(of({ ...order, status: 'confirmed', confirmedAt: '2026-01-02T00:00:00.000Z' }));
    createComponent();

    component.requestConfirm();
    fixture.detectChanges();

    expect(component.pendingAction).toBe('confirm');
    expect(component.pendingActionMessage).toContain('CAR-ABC12');
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();

    component.runPendingAction();
    fixture.detectChanges();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.confirmOrder).toHaveBeenCalledWith('o1');
    expect(component.order?.status).toBe('confirmed');
  });

  it('cancela solo tras aceptar el diálogo', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.cancelOrder.and.returnValue(of({ ...order, status: 'cancelled' }));
    createComponent();

    component.requestCancel();
    fixture.detectChanges();

    expect(component.pendingActionMessage).toContain('¿Cancelar la orden CAR-ABC12?');
    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();

    component.runPendingAction();
    fixture.detectChanges();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.cancelOrder).toHaveBeenCalledWith('o1');
    expect(component.order?.status).toBe('cancelled');
  });

  it('cierra el diálogo sin ejecutar la acción', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    component.requestCancel();
    component.closePendingAction();

    expect(component.pendingAction).toBeNull();
    expect(orderServiceSpy.cancelOrder).not.toHaveBeenCalled();
    expect(orderServiceSpy.confirmOrder).not.toHaveBeenCalled();
  });

  it('muestra "Orden no encontrada" si el endpoint devuelve 404', () => {
    const notFound = new Error('Orden no encontrada') as Error & { status?: number };
    notFound.status = 404;
    orderServiceSpy.getOrderByCode.and.returnValue(throwError(() => notFound));
    createComponent();

    expect(component.errorMessage).toBe('Orden no encontrada.');
    expect(fixture.nativeElement.textContent).toContain('Orden no encontrada.');
  });

  it('muestra el breadcrumb y el botón volver hacia el listado', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    const backLink = fixture.nativeElement.querySelector('.back-btn');
    expect(backLink).not.toBeNull();
    expect(backLink.href).toContain('/admin/orders');

    const breadcrumb = fixture.nativeElement.querySelector('.breadcrumb');
    expect(breadcrumb.textContent).toContain('Órdenes');
    expect(breadcrumb.textContent).toContain('CAR-ABC12');
  });
});
