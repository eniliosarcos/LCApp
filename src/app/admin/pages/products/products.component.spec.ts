import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { ProductsComponent } from './products.component';

const categories: Category[] = [
  { id: 'c1', name: 'Rosas', slug: 'rosas', description: '' },
  { id: 'c2', name: 'Girasoles', slug: 'girasoles', description: '' }
];

const product = (id: string, name: string, categoryId: string, overrides: Partial<Product> = {}): Product => ({
  id,
  categoryId,
  name,
  slug: name.toLowerCase(),
  description: '',
  price: 150,
  stock: 5,
  sku: `${id}-SKU`,
  images: [],
  tags: [],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let component: ProductsComponent;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCategories', 'getAllProducts', 'createProduct', 'updateProduct']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['show']);

    await TestBed.configureTestingModule({
      declarations: [ProductsComponent, CurrencyFormatPipe, AppModalComponent, AppLoadingSpinnerComponent],
      imports: [FormsModule],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        { provide: SnackbarService, useValue: snackbarSpy }
      ]
    }).compileComponents();
  });

  it('carga categorías y productos y muestra el nombre de la categoría', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', 'Rosa Roja', 'c1')]));
    createComponent();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Rosa Roja');
    expect(rows[0].textContent).toContain('Rosas');
    expect(rows[0].textContent).toContain('$150');
    expect(rows[0].textContent).toContain('Activo');
  });

  it('muestra guión cuando la categoría del producto no se encuentra', () => {
    catalogServiceSpy.getCategories.and.returnValue(of([]));
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', 'Rosa Roja', 'no-existe')]));
    createComponent();

    expect(component.categoryName('no-existe')).toBe('-');
  });

  it('muestra mensaje vacío cuando no hay productos', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay productos registrados.');
  });

  it('muestra el error si falla la carga', () => {
    catalogServiceSpy.getCategories.and.returnValue(throwError(() => new Error('boom')));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los datos del catálogo.');
  });

  it('abre el modal con el formulario vacío al pulsar "Nuevo producto"', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    fixture.nativeElement.querySelector('.btn-primary').click();
    fixture.detectChanges();

    expect(component.formOpen).toBeTrue();
    expect(component.editingProduct).toBeNull();
    expect(component.form.name).toBe('');
    expect(fixture.nativeElement.querySelector('.modal-header h2').textContent).toContain('Nuevo producto');
  });

  it('precarga el formulario al editar un producto', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    const p1 = product('p1', 'Rosa Roja', 'c1', {
      discountPrice: 120,
      tags: ['flor'],
      images: [{ id: 'i1', url: 'http://img', alt: 'Rosa Roja', isPrimary: true, order: 0 }],
      isActive: false
    });
    component.openEdit(p1);

    expect(component.editingProduct).toBe(p1);
    expect(component.form.name).toBe('Rosa Roja');
    expect(component.form.discountPrice).toBe(120);
    expect(component.form.imageUrl).toBe('http://img');
    expect(component.form.isActive).toBeFalse();
  });

  it('crea un producto y muestra el mensaje de éxito', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    catalogServiceSpy.createProduct.and.returnValue(of(product('p2', 'Nuevo', 'c1')));
    createComponent();

    component.openCreate();
    component.form.name = 'Nuevo producto';
    component.form.categoryId = 'c1';
    component.form.price = 99;
    component.form.stock = 3;
    component.onSubmit();

    expect(catalogServiceSpy.createProduct).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Nuevo producto',
      categoryId: 'c1',
      price: 99,
      stock: 3
    }));
    expect(snackbarSpy.show).toHaveBeenCalledWith('Producto creado', 'success');
    expect(component.formOpen).toBeFalse();
  });

  it('edita un producto y muestra el mensaje de éxito', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    catalogServiceSpy.updateProduct.and.returnValue(of(product('p1', 'Rosa Editada', 'c1')));
    createComponent();

    const p1 = product('p1', 'Rosa Roja', 'c1');
    component.openEdit(p1);
    component.form.name = 'Rosa Editada';
    component.onSubmit();

    expect(catalogServiceSpy.updateProduct).toHaveBeenCalledWith('p1', jasmine.objectContaining({ name: 'Rosa Editada' }));
    expect(snackbarSpy.show).toHaveBeenCalledWith('Producto actualizado', 'success');
  });

  it('desactiva un producto al pulsar Desactivar', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', 'Rosa Roja', 'c1')]));
    catalogServiceSpy.updateProduct.and.returnValue(of(product('p1', 'Rosa Roja', 'c1', { isActive: false })));
    createComponent();

    component.toggleActive(component.products[0]);

    expect(catalogServiceSpy.updateProduct).toHaveBeenCalledWith('p1', { isActive: false });
    expect(snackbarSpy.show).toHaveBeenCalledWith('Producto desactivado', 'success');
    expect(component.products[0].isActive).toBeFalse();
  });

  it('no envía el formulario si faltan campos obligatorios', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    component.openCreate();
    component.form.name = '';
    component.form.categoryId = 'c1';
    component.form.price = 99;
    component.onSubmit();

    expect(catalogServiceSpy.createProduct).not.toHaveBeenCalled();
    expect(component.formError).toContain('nombre, categoría');
  });

  it('muestra el error del servidor en el formulario', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    catalogServiceSpy.createProduct.and.returnValue(throwError(() => new Error('El SKU ya existe')));
    createComponent();

    component.openCreate();
    component.form.name = 'X';
    component.form.categoryId = 'c1';
    component.form.price = 10;
    component.onSubmit();

    expect(component.formError).toBe('El SKU ya existe');
    expect(component.formSaving).toBeFalse();
  });
});
