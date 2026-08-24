import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Order } from '../../../../core/models/order.model';
import { Product } from '../../../../core/models/product.model';
import { CatalogService } from '../../../../core/services/catalog.service';
import { OrderService } from '../../../../core/services/order.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { AppConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/app-confirm-dialog.component';
import { AppModalComponent } from '../../../../shared/components/modal/app-modal.component';
import { ManualSaleModalComponent } from './manual-sale-modal.component';

const product = (id: string, overrides: Partial<Product> = {}): Product => ({
  id,
  categoryId: 'c1',
  name: `Producto ${id}`,
  slug: id,
  description: '',
  price: 100,
  stock: 10,
  sku: '',
  images: [],
  tags: [],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

describe('ManualSaleModalComponent', () => {
  let fixture: ComponentFixture<ManualSaleModalComponent>;
  let component: ManualSaleModalComponent;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;
  let savedSpy: jasmine.Spy;

  function createComponent(): void {
    fixture = TestBed.createComponent(ManualSaleModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function openModal(): void {
    component.open = true;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getAllProducts']);
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['createManualOrder']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['show']);

    await TestBed.configureTestingModule({
      declarations: [ManualSaleModalComponent, AppModalComponent, AppConfirmDialogComponent],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy }
      ]
    }).compileComponents();
  });

  it('carga solo los productos activos', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(
      of([product('p1'), product('p2', { isActive: false }), product('p3')])
    );
    createComponent();

    expect(component.activeProducts.map(p => p.id)).toEqual(['p1', 'p3']);
  });

  it('resetea el formulario al abrir: una línea vacía, fecha de hoy, sin cliente', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    component.customerName = 'Juan';
    component.lines = [
      { productId: 'p1', quantity: 2, price: null },
      { productId: 'p1', quantity: 1, price: 90 }
    ];

    openModal();

    expect(component.customerName).toBe('');
    expect(component.lines.length).toBe(1);
    expect(component.lines[0].productId).toBe('');
    expect(component.saleDate).toBe(component.todayString());
    expect(component.confirming).toBeFalse();
  });

  it('agrega líneas y no permite quitar la última', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    component.addLine();
    expect(component.lines.length).toBe(2);

    component.removeLine(1);
    expect(component.lines.length).toBe(1);

    component.removeLine(0);
    expect(component.lines.length).toBe(1);
  });

  it('al elegir un producto autocompleta el precio efectivo (con descuento primero)', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(
      of([product('p1', { price: 100, discountPrice: 80 })])
    );
    createComponent();

    component.onProductChange(0, 'p1');

    expect(component.lines[0].price).toBe(80);
    expect(component.lineUnitPrice(component.lines[0])).toBe(80);
  });

  it('muestra cantidad y precio unitario recién al seleccionar un producto', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();
    openModal();

    expect(fixture.nativeElement.querySelector('.sale-line__qty')).toBeNull();
    expect(fixture.nativeElement.querySelector('.sale-line__price')).toBeNull();

    component.onProductChange(0, 'p1');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.sale-line__qty input')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.sale-line__price input')).not.toBeNull();
  });

  it('usa el precio de lista si no hay descuento', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    expect(component.effectivePrice(product('p1'))).toBe(100);
  });

  it('calcula el total respetando el precio sobreescrito', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    component.onProductChange(0, 'p1');
    component.lines[0].price = 90;
    component.lines[0].quantity = 2;
    component.addLine();
    component.onProductChange(1, 'p1');
    component.lines[1].quantity = 1;

    expect(component.total).toBe(90 * 2 + 100);
  });

  it('muestra el error de validación en un diálogo', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();
    openModal();

    component.onSubmit();
    fixture.detectChanges();

    expect(component.confirming).toBeFalse();
    expect(component.formError).toContain('al menos un producto');
    expect(component.showError).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('al menos un producto');
  });

  it('valida que la cantidad no supere el stock', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', { stock: 3 })]));
    createComponent();

    component.onProductChange(0, 'p1');
    component.lines[0].quantity = 4;
    component.onSubmit();

    expect(component.confirming).toBeFalse();
    expect(component.formError).toContain('Stock insuficiente');
    expect(component.showError).toBeTrue();
  });

  it('muestra el diálogo de doble confirmación antes de guardar y no llama al servicio', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    orderServiceSpy.createManualOrder.and.returnValue(of({} as Order));
    createComponent();
    openModal();

    component.onProductChange(0, 'p1');
    component.lines[0].quantity = 2;
    component.onSubmit();
    fixture.detectChanges();

    expect(component.confirming).toBeTrue();
    expect(orderServiceSpy.createManualOrder).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Sí, registrar');
  });

  it('registra la venta al confirmar el diálogo, emite saved y cierra', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', { price: 50 })]));
    const savedOrder = { code: 'MAN-AB12C' } as Order;
    orderServiceSpy.createManualOrder.and.returnValue(of(savedOrder));
    createComponent();

    component.customerName = '  María  ';
    component.saleDate = '2026-08-14';
    component.onProductChange(0, 'p1');
    component.lines[0].price = 45;
    component.lines[0].quantity = 3;
    component.onSubmit();

    savedSpy = spyOn(component.saved, 'emit');
    component.runConfirm();

    expect(orderServiceSpy.createManualOrder).toHaveBeenCalledWith(jasmine.objectContaining({
      customerName: 'María',
      saleDate: jasmine.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      items: [{ productId: 'p1', quantity: 3, price: 45 }]
    }));
    expect(snackbarSpy.show).toHaveBeenCalledWith('Venta MAN-AB12C registrada', 'success');
    expect(savedSpy).toHaveBeenCalled();
    expect(component.confirming).toBeFalse();
    expect(component.saving).toBeFalse();
  });

  it('muestra el error del servicio en un diálogo y lo cierra', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    orderServiceSpy.createManualOrder.and.returnValue(throwError(() => new Error('Stock insuficiente para X')));
    createComponent();
    openModal();

    component.onProductChange(0, 'p1');
    component.onSubmit();
    component.runConfirm();
    fixture.detectChanges();

    expect(component.saving).toBeFalse();
    expect(component.formError).toBe('Stock insuficiente para X');
    expect(component.showError).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudo registrar la venta');
    expect(fixture.nativeElement.textContent).toContain('Stock insuficiente para X');

    component.dismissError();
    fixture.detectChanges();

    expect(component.showError).toBeFalse();
  });

  it('cancela la confirmación y vuelve al formulario', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    component.onProductChange(0, 'p1');
    component.onSubmit();
    component.cancelConfirm();

    expect(component.confirming).toBeFalse();
    expect(orderServiceSpy.createManualOrder).not.toHaveBeenCalled();
  });

  it('cierra el modal salvo que esté guardando', () => {
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1')]));
    createComponent();

    const closedSpy = spyOn(component.closed, 'emit');

    component.saving = true;
    component.close();
    expect(closedSpy).not.toHaveBeenCalled();

    component.saving = false;
    component.close();
    expect(closedSpy).toHaveBeenCalled();
  });
});
