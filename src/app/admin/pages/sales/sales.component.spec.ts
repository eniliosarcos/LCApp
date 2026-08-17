import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { OrderSummary } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { SalesComponent } from './sales.component';

@Component({ selector: 'app-manual-sale-modal', template: '' })
class ManualSaleModalStub {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
}

const summary = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  range: 'week',
  from: '2026-08-10T00:00:00.000Z',
  to: '2026-08-14T00:00:00.000Z',
  sales: 5,
  cancelled: 2,
  pending: 1,
  totalOrders: 8,
  revenue: 463.45,
  units: 9,
  topProducts: [
    { productId: 'p1', productName: 'Teclado mecánico', units: 5, revenue: 100 },
    { productId: 'p2', productName: 'Mouse inalámbrico', units: 3, revenue: 300 },
    { productId: 'p3', productName: 'Balón de fútbol', units: 2, revenue: 50 }
  ],
  byCategory: [
    { categoryName: 'Electrónica', units: 8, revenue: 400 },
    { categoryName: 'Hogar', units: 1, revenue: 63.45 }
  ],
  ...overrides
});

describe('SalesComponent', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let component: SalesComponent;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let routeSpy: { queryParamMap: import('rxjs').Observable<ReturnType<typeof convertToParamMap>> };
  let routerSpy: jasmine.SpyObj<Router>;

  function createComponent(): void {
    fixture = TestBed.createComponent(SalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getSummary']);
    routeSpy = { queryParamMap: of(convertToParamMap({})) };
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [SalesComponent, ManualSaleModalStub, AppLoadingSpinnerComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ActivatedRoute, useValue: routeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();
  });

  it('carga el resumen semanal por defecto y renderiza las métricas', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    expect(orderServiceSpy.getSummary).toHaveBeenCalledWith('week');
    expect(component.summary?.sales).toBe(5);
    expect(component.summary?.revenue).toBe(463.45);
    expect(fixture.nativeElement.textContent).toContain('Ventas');
    expect(fixture.nativeElement.textContent).toContain('Productos más vendidos');
    expect(fixture.nativeElement.textContent).toContain('Teclado mecánico');
    expect(fixture.nativeElement.textContent).toContain('Electrónica');
  });

  it('cambia de rango y vuelve a consultar el resumen', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    component.selectRange('month');

    expect(component.range).toBe('month');
    expect(orderServiceSpy.getSummary).toHaveBeenCalledTimes(2);
    expect(orderServiceSpy.getSummary).toHaveBeenCalledWith('month');
  });

  it('ignora seleccionar el rango ya activo', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    component.selectRange('week');

    expect(orderServiceSpy.getSummary).toHaveBeenCalledTimes(1);
  });

  it('calcula ticket promedio y tasa de cancelación', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    expect(component.avgTicket).toBeCloseTo(92.69);
    expect(component.cancellationRate).toBeCloseTo(0.25);
  });

  it('devuelve 0 en ticket promedio y tasa de cancelación sin datos', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary({ sales: 0, totalOrders: 0 })));
    createComponent();

    expect(component.avgTicket).toBe(0);
    expect(component.cancellationRate).toBe(0);
  });

  it('ordena productos por unidades por defecto y alterna a ingreso', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    expect(component.sortedTopProducts.map(p => p.productId)).toEqual(['p1', 'p2', 'p3']);

    component.toggleProductSort('revenue');

    expect(component.productSort).toBe('revenue');
    expect(component.sortedTopProducts.map(p => p.productId)).toEqual(['p2', 'p1', 'p3']);
  });

  it('muestra mensaje vacío cuando no hay productos vendidos', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary({ topProducts: [] })));
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay ventas en el período.');
  });

  it('muestra el error si falla la carga', () => {
    orderServiceSpy.getSummary.and.returnValue(throwError(() => new Error('boom')));
    createComponent();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los datos del resumen.');
  });

  it('abre el modal de registro con el botón', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    const button = fixture.nativeElement.querySelector('.btn-register');
    button.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.registerOpen).toBeTrue();
  });

  it('abre el modal de registro si llega con ?registrar=1', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    routeSpy.queryParamMap = of(convertToParamMap({ registrar: '1' }));
    createComponent();

    expect(component.registerOpen).toBeTrue();
  });

  it('cierra el modal y recarga el resumen al registrar una venta', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    createComponent();

    component.openRegister();
    component.onManualSaleSaved();

    expect(component.registerOpen).toBeFalse();
    expect(orderServiceSpy.getSummary).toHaveBeenCalledTimes(2);
  });

  it('quita ?registrar=1 de la URL al cerrar el modal', () => {
    orderServiceSpy.getSummary.and.returnValue(of(summary()));
    routeSpy.queryParamMap = of(convertToParamMap({ registrar: '1' }));
    createComponent();
    expect(component.registerOpen).toBeTrue();

    component.closeRegister();

    expect(component.registerOpen).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith([], {
      queryParams: { registrar: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  });
});
