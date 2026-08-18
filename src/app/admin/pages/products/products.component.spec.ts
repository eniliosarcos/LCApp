import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { FormImage, Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { ImageService } from '../../../core/services/image.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppLoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { AppModalComponent } from '../../../shared/components/modal/app-modal.component';
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
  let imageServiceSpy: jasmine.SpyObj<ImageService>;
  let snackbarSpy: jasmine.SpyObj<SnackbarService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCategories', 'getAllProducts', 'createProduct', 'updateProduct', 'deleteProduct']);
    imageServiceSpy = jasmine.createSpyObj('ImageService', ['uploadImage']);
    snackbarSpy = jasmine.createSpyObj('SnackbarService', ['show']);

    await TestBed.configureTestingModule({
      declarations: [ProductsComponent, AppModalComponent, AppLoadingSpinnerComponent],
      imports: [FormsModule],
      providers: [
        { provide: CatalogService, useValue: catalogServiceSpy },
        { provide: ImageService, useValue: imageServiceSpy },
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

  it('muestra el valor del inventario en el header cuando hay productos', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'A', 'c1', { price: 10, stock: 5 }),
      product('p2', 'B', 'c1', { price: 25, stock: 3 })
    ]));
    createComponent();

    const subtitle = fixture.nativeElement.querySelector('.page-header__subtitle');
    expect(subtitle).not.toBeNull();
    expect(subtitle.textContent).toContain('Inventario:');
    expect(subtitle.textContent).toContain('$125');
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

  it('clasifica el estado de stock solo de productos activos', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    expect(component.stockStatus(product('p1', 'A', 'c1', { stock: 0 }))).toBe('out');
    expect(component.stockStatus(product('p2', 'B', 'c1', { stock: 1 }))).toBe('low');
    expect(component.stockStatus(product('p3', 'C', 'c1', { stock: 2 }))).toBe('low');
    expect(component.stockStatus(product('p4', 'D', 'c1', { stock: 5 }))).toBeNull();
    expect(component.stockStatus(product('p5', 'E', 'c1', { stock: 0, isActive: false }))).toBeNull();
  });

  it('cuenta productos agotados y con stock bajo solo entre activos', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'Agotado', 'c1', { stock: 0 }),
      product('p2', 'Bajo', 'c1', { stock: 3 }),
      product('p3', 'Sano', 'c1', { stock: 11 }),
      product('p4', 'Inactivo', 'c1', { stock: 0, isActive: false })
    ]));
    createComponent();

    expect(component.outOfStockCount).toBe(1);
    expect(component.lowStockCount).toBe(1);
  });

  it('calcula el valor total del inventario como suma de price * stock', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'A', 'c1', { price: 10, stock: 5 }),
      product('p2', 'B', 'c1', { price: 25, stock: 3 }),
      product('p3', 'C', 'c1', { price: 0, stock: 100 })
    ]));
    createComponent();

    expect(component.inventoryValue).toBe(125);
  });

  it('filtra la tabla por agotados o stock bajo y resetea', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'Agotado', 'c1', { stock: 0 }),
      product('p2', 'Bajo', 'c1', { stock: 3 }),
      product('p3', 'Sano', 'c1', { stock: 11 })
    ]));
    createComponent();

    component.toggleStockFilter('out');
    expect(component.visibleProducts.map(p => p.name)).toEqual(['Agotado']);

    component.toggleStockFilter('low');
    expect(component.visibleProducts.map(p => p.name)).toEqual(['Bajo']);

    component.resetStockFilter();
    expect(component.visibleProducts.length).toBe(3);
  });

  it('resalta filas agotadas y con stock bajo y muestra el resumen', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'Agotado', 'c1', { stock: 0 }),
      product('p2', 'Bajo', 'c1', { stock: 3 }),
      product('p3', 'Sano', 'c1', { stock: 11 })
    ]));
    createComponent();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Agotados (1)');
    expect(text).toContain('Stock bajo (1)');

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows[0].classList.contains('row-out')).toBeTrue();
    expect(rows[1].classList.contains('row-low')).toBeTrue();
    expect(rows[2].classList.contains('row-low')).toBeFalse();
    expect(rows[0].querySelector('td').classList.contains('product-name--emphasis')).toBeTrue();
    expect(rows[1].querySelector('td').classList.contains('product-name--emphasis')).toBeTrue();
  });

  it('marca el nombre en rojo solo para productos agotados', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'Agotado', 'c1', { stock: 0 }),
      product('p2', 'Bajo', 'c1', { stock: 3 })
    ]));
    createComponent();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    const outName = rows[0].querySelector('td');
    const lowName = rows[1].querySelector('td');

    expect(outName.classList.contains('product-name--out')).toBeTrue();
    expect(lowName.classList.contains('product-name--out')).toBeFalse();

    const outStock = rows[0].querySelectorAll('td')[3];
    const lowStock = rows[1].querySelectorAll('td')[3];
    expect(outStock.classList.contains('stock-number--out')).toBeTrue();
    expect(lowStock.classList.contains('stock-number--out')).toBeFalse();
  });

  it('al hacer click en un chip filtra la tabla y "Ver todas" resetea', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([
      product('p1', 'Agotado', 'c1', { stock: 0 }),
      product('p2', 'Bajo', 'c1', { stock: 3 }),
      product('p3', 'Sano', 'c1', { stock: 11 })
    ]));
    createComponent();

    fixture.nativeElement.querySelector('.stock-chip--out').click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Agotado');

    const reset = fixture.nativeElement.querySelector('.stock-chip--reset');
    expect(reset).not.toBeNull();
    reset.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(3);
  });

  it('muestra mensaje según el filtro cuando no hay coincidencias', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([product('p1', 'Sano', 'c1', { stock: 11 })]));
    createComponent();

    component.toggleStockFilter('out');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No hay productos agotados.');
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
    expect(component.form.images.length).toBe(1);
    expect(component.form.images[0].url).toBe('http://img');
    expect(component.form.images[0].isPrimary).toBeTrue();
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

  it('sube una imagen y guarda la URL principal y las variantes', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    imageServiceSpy.uploadImage.and.returnValue(of({
      primaryUrl: 'https://img.example/400w.webp',
      variants: [
        { width: 400, url: 'https://img.example/400w.webp' },
        { width: 800, url: 'https://img.example/800w.webp' }
      ]
    }));
    createComponent();

    component.openCreate();
    const file = new File(['data'], 'foto.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);

    expect(imageServiceSpy.uploadImage).toHaveBeenCalledWith(file, jasmine.any(String));
    expect(component.form.images.length).toBe(1);
    expect(component.form.images[0].url).toBe('https://img.example/400w.webp');
    expect(component.form.images[0].variants.length).toBe(2);
    expect(component.form.images[0].isPrimary).toBeTrue();
    expect(component.uploadingImage).toBeFalse();
  });

  it('rechaza archivos que no son imágenes', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    component.openCreate();
    const file = new File(['texto'], 'nota.txt', { type: 'text/plain' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);

    expect(imageServiceSpy.uploadImage).not.toHaveBeenCalled();
    expect(component.formError).toContain('Solo se permiten imágenes');
  });

  it('rechaza imágenes mayores a 5 MB', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    createComponent();

    component.openCreate();
    const file = new File(['data'], 'grande.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);

    expect(imageServiceSpy.uploadImage).not.toHaveBeenCalled();
    expect(component.formError).toContain('5 MB');
  });

  it('muestra el error del servidor si falla la subida', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    imageServiceSpy.uploadImage.and.returnValue(throwError(() => new Error('No se pudo procesar la imagen')));
    createComponent();

    component.openCreate();
    const file = new File(['data'], 'foto.jpg', { type: 'image/jpeg' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onFileSelected(event);

    expect(component.formError).toBe('No se pudo procesar la imagen');
    expect(component.uploadingImage).toBeFalse();
  });

  it('envía las variantes de imagen en el payload del producto', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getAllProducts.and.returnValue(of([]));
    catalogServiceSpy.createProduct.and.returnValue(of(product('p2', 'Nuevo', 'c1')));
    createComponent();

    component.openCreate();
    component.form.name = 'Nuevo producto';
    component.form.categoryId = 'c1';
    component.form.price = 99;
    component.form.images = [{
      url: 'https://img.example/400w.webp',
      variants: [
        { width: 400, url: 'https://img.example/400w.webp' },
        { width: 800, url: 'https://img.example/800w.webp' }
      ],
      alt: 'Nuevo producto',
      isPrimary: true,
      order: 0,
    }];
    component.onSubmit();

    expect(catalogServiceSpy.createProduct).toHaveBeenCalledWith(jasmine.objectContaining({
      images: [{
        url: 'https://img.example/400w.webp',
        alt: 'Nuevo producto',
        isPrimary: true,
        order: 0,
        variants: [
          { width: 400, url: 'https://img.example/400w.webp' },
          { width: 800, url: 'https://img.example/800w.webp' }
        ]
      }]
    }));
  });
});
