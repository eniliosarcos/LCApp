import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { CreditSalePage, Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CreditSalesComponent } from './credit-sales.component';

describe('CreditSalesComponent', () => {
  let fixture: ComponentFixture<CreditSalesComponent>;
  let component: CreditSalesComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;

  const order: Order = {
    id: 'o1',
    code: 'FIA-AB12C',
    customerName: 'María',
    items: [],
    status: 'confirmed',
    source: 'fiado',
    total: 100,
    paymentStatus: 'partial',
    amountPaid: 30,
    payments: [],
    createdAt: '2026-08-01T00:00:00.000Z'
  };

  function pageResult(orders: Order[], total: number, totalPages: number, totalPending = 0): CreditSalePage {
    return { orders, total, page: 1, limit: 10, totalPages, totalPending };
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(CreditSalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getCreditSales']);

    await TestBed.configureTestingModule({
      declarations: [CreditSalesComponent, AppLoadingSpinnerComponent],
      imports: [CommonModule, FormsModule, RouterTestingModule],
      providers: [{ provide: OrderService, useValue: orderServiceSpy }]
    }).compileComponents();
  });

  it('carga la primera página sin filtros al iniciar', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([order], 1, 1)));
    createComponent();

    expect(orderServiceSpy.getCreditSales).toHaveBeenCalledWith(1, 10, undefined, undefined);
    expect(component.orders.length).toBe(1);
    expect(component.total).toBe(1);
    expect(component.loading).toBeFalse();
  });

  it('muestra el monto pendiente de cobro y la fila con saldo', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([order], 1, 1, 70)));
    createComponent();

    expect(component.totalPending).toBe(70);
    expect(component.remaining(order)).toBe(70);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('María');
  });

  it('muestra el error si la carga falla', () => {
    orderServiceSpy.getCreditSales.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(component.errorMessage).toBe('boom');
  });

  it('cambiar el filtro de estado resetea la página a 1 y recarga', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 0)));
    createComponent();

    component.page = 4;
    component.onFilterChange('paid');

    expect(component.page).toBe(1);
    expect(component.statusFilter).toBe('paid');
    expect(orderServiceSpy.getCreditSales).toHaveBeenCalledWith(1, 10, 'paid', undefined);
  });

  it('buscar recorta el término y resetea la página a 1', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 0)));
    createComponent();

    component.page = 3;
    component.onSearchInput('  maria  ');

    expect(component.page).toBe(1);
    expect(orderServiceSpy.getCreditSales).toHaveBeenCalledWith(1, 10, undefined, 'maria');
  });

  it('goToPage ignora páginas inválidas o la actual', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 5)));
    createComponent();
    orderServiceSpy.getCreditSales.calls.reset();

    component.goToPage(0);
    component.goToPage(6);
    component.goToPage('...');
    component.page = 5;
    component.goToPage(5);
    expect(orderServiceSpy.getCreditSales).not.toHaveBeenCalled();

    component.goToPage(3);
    expect(orderServiceSpy.getCreditSales).toHaveBeenCalled();
  });

  it('navega al detalle del crédito', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([order], 1, 1)));
    createComponent();

    component.goToDetail(order);

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/credit/detail', 'FIA-AB12C']);
  });

  it('pageNumbers devuelve la secuencia completa si hay 7 o menos páginas', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 7)));
    createComponent();
    component.totalPages = 7;
    component.page = 3;
    expect(component.pageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('pageNumbers agrega elipsis al final en la primera página', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 10)));
    createComponent();
    component.totalPages = 10;
    component.page = 1;
    expect(component.pageNumbers).toEqual([1, 2, '...', 10]);
  });

  it('pageNumbers muestra elipsis a ambos lados en página intermedia', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 10)));
    createComponent();
    component.totalPages = 10;
    component.page = 5;
    expect(component.pageNumbers).toEqual([1, '...', 4, 5, 6, '...', 10]);
  });

  it('pageNumbers agrega elipsis al inicio en la última página', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 10)));
    createComponent();
    component.totalPages = 10;
    component.page = 10;
    expect(component.pageNumbers).toEqual([1, '...', 9, 10]);
  });

  it('rangeLabel devuelve "0 créditos" si no hay filas', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 0)));
    createComponent();
    component.total = 0;
    component.page = 1;
    expect(component.rangeLabel).toBe('0 créditos');
  });

  it('rangeLabel muestra el rango visible', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 0, 1)));
    createComponent();
    component.total = 25;
    component.page = 3;
    expect(component.rangeLabel).toBe('21–25 de 25');

    component.page = 1;
    expect(component.rangeLabel).toBe('1–10 de 25');
  });

  it('recorta la página si queda fuera de rango y recarga', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([], 25, 3)));
    createComponent();

    component.page = 5;
    (component as unknown as { loadCreditSales(): void }).loadCreditSales();

    expect(component.page).toBe(3);
    expect(component.totalPages).toBe(3);
    expect(orderServiceSpy.getCreditSales).toHaveBeenCalledTimes(3);
  });

  it('desactiva los botones de paginación en los bordes', () => {
    orderServiceSpy.getCreditSales.and.returnValue(of(pageResult([order, order], 2, 2)));
    createComponent();

    const prev = fixture.nativeElement.querySelector('[aria-label="Página anterior"]');
    const next = fixture.nativeElement.querySelector('[aria-label="Página siguiente"]');
    expect(prev.disabled).toBeTrue();
    expect(next.disabled).toBeFalse();

    component.goToPage(2);
    fixture.detectChanges();
    expect(next.disabled).toBeTrue();
  });

  it('no muestra paginación si hubo error', () => {
    orderServiceSpy.getCreditSales.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(fixture.nativeElement.querySelector('nav.pagination')).toBeNull();
  });
});
