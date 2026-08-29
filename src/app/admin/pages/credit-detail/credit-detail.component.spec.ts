import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CreditDetailComponent } from './credit-detail.component';

describe('CreditDetailComponent', () => {
  let fixture: ComponentFixture<CreditDetailComponent>;
  let component: CreditDetailComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  const routeStub = { snapshot: { paramMap: { get: () => 'FIA-AB12C' } } };

  const order: Order = {
    id: 'o1',
    code: 'FIA-AB12C',
    customerName: 'María',
    customerPhone: '12345678',
    items: [{ productId: 'p1', productName: 'Rosa', quantity: 2, price: 50 }],
    status: 'confirmed',
    source: 'fiado',
    total: 100,
    paymentStatus: 'partial',
    amountPaid: 30,
    payments: [{ amount: 30, date: '2026-08-01T00:00:00.000Z', note: 'Abono' }],
    createdAt: '2026-08-01T00:00:00.000Z'
  };

  function createComponent(): void {
    fixture = TestBed.createComponent(CreditDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrderByCode', 'addPayment']);

    await TestBed.configureTestingModule({
      declarations: [CreditDetailComponent, AppLoadingSpinnerComponent],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      providers: [
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: OrderService, useValue: orderServiceSpy }
      ]
    }).compileComponents();
  });

  it('carga el fiado por código y muestra sus datos', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    expect(orderServiceSpy.getOrderByCode).toHaveBeenCalledWith('FIA-AB12C');
    expect(component.order?.code).toBe('FIA-AB12C');
    expect(component.remaining).toBe(70);

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('María');
    expect(text).toContain('Rosa');
    expect(text).toContain('Abono');
  });

  it('muestra "Fiado no encontrado." si el endpoint devuelve 404', () => {
    const notFound = new Error('Fiado no encontrado') as Error & { status?: number };
    notFound.status = 404;
    orderServiceSpy.getOrderByCode.and.returnValue(throwError(() => notFound));
    createComponent();

    expect(component.errorMessage).toBe('Fiado no encontrado.');
    expect(fixture.nativeElement.textContent).toContain('Fiado no encontrado.');
  });

  it('muestra el mensaje del error genérico si la carga falla', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(component.errorMessage).toBe('boom');
  });

  it('calcula el saldo pendiente con redondeo a 2 decimales', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of({ ...order, total: 10.15, amountPaid: 10.1 }));
    createComponent();

    expect(component.remaining).toBe(0.05);
    expect(component.maxPayment).toBe(0.05);
  });

  it('oculta el formulario de abono cuando el fiado está pagado', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of({ ...order, paymentStatus: 'paid', amountPaid: 100 }));
    createComponent();

    expect(component.canPay).toBeFalse();
    expect(fixture.nativeElement.querySelector('.payment-form')).toBeNull();
  });

  it('ignora el submit si no hay monto o es <= 0', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    component.paymentAmount = null;
    component.submitPayment();
    expect(orderServiceSpy.addPayment).not.toHaveBeenCalled();

    component.paymentAmount = 0;
    component.submitPayment();
    expect(orderServiceSpy.addPayment).not.toHaveBeenCalled();
  });

  it('registra el abono, actualiza la orden y resetea el formulario', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.addPayment.and.returnValue(of({ ...order, amountPaid: 60, paymentStatus: 'partial' }));
    createComponent();

    component.paymentAmount = 30;
    component.paymentNote = '  Segundo abono  ';
    component.submitPayment();

    expect(orderServiceSpy.addPayment).toHaveBeenCalledWith('o1', { amount: 30, note: 'Segundo abono' });
    expect(component.order?.amountPaid).toBe(60);
    expect(component.paymentAmount).toBeNull();
    expect(component.paymentNote).toBe('');
    expect(component.submitting).toBeFalse();
  });

  it('omite la nota si está vacía al registrar el abono', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.addPayment.and.returnValue(of(order));
    createComponent();

    component.paymentAmount = 20;
    component.paymentNote = '   ';
    component.submitPayment();

    expect(orderServiceSpy.addPayment).toHaveBeenCalledWith('o1', { amount: 20, note: undefined });
  });

  it('muestra el error de acción si el abono falla', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    orderServiceSpy.addPayment.and.returnValue(throwError(() => new Error('Monto excede el saldo pendiente')));
    createComponent();

    component.paymentAmount = 500;
    component.submitPayment();
    fixture.detectChanges();

    expect(component.actionError).toBe('Monto excede el saldo pendiente');
    expect(component.submitting).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Monto excede el saldo pendiente');
  });

  it('muestra el breadcrumb y el botón volver hacia el listado', () => {
    orderServiceSpy.getOrderByCode.and.returnValue(of(order));
    createComponent();

    const backLink = fixture.nativeElement.querySelector('.back-btn');
    expect(backLink).not.toBeNull();
    expect(backLink.getAttribute('href')).toContain('/admin/credit');

    const breadcrumb = fixture.nativeElement.querySelector('.breadcrumb');
    expect(breadcrumb.textContent).toContain('Fiados');
    expect(breadcrumb.textContent).toContain('FIA-AB12C');
  });
});
