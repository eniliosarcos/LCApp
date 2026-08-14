import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { ProductsComponent } from './products.component';

const categories: Category[] = [
  { id: 'c1', name: 'Rosas', slug: 'rosas', description: '' },
  { id: 'c2', name: 'Girasoles', slug: 'girasoles', description: '' }
];

const product = (id: string, name: string, categoryId: string): Product => ({
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
  createdAt: '2026-01-01T00:00:00.000Z'
});

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let component: ProductsComponent;
  let catalogServiceSpy: jasmine.SpyObj<CatalogService>;

  function createComponent(): void {
    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(async () => {
    catalogServiceSpy = jasmine.createSpyObj('CatalogService', ['getCategories', 'getProducts']);

    await TestBed.configureTestingModule({
      declarations: [ProductsComponent, CurrencyFormatPipe],
      providers: [{ provide: CatalogService, useValue: catalogServiceSpy }]
    }).compileComponents();
  });

  it('carga categorías y productos y muestra el nombre de la categoría', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getProducts.and.returnValue(of([product('p1', 'Rosa Roja', 'c1')]));
    createComponent();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Rosa Roja');
    expect(rows[0].textContent).toContain('Rosas');
    expect(rows[0].textContent).toContain('$150');
  });

  it('muestra guión cuando la categoría del producto no se encuentra', () => {
    catalogServiceSpy.getCategories.and.returnValue(of([]));
    catalogServiceSpy.getProducts.and.returnValue(of([product('p1', 'Rosa Roja', 'no-existe')]));
    createComponent();

    expect(component.categoryName('no-existe')).toBe('-');
  });

  it('muestra mensaje vacío cuando no hay productos', () => {
    catalogServiceSpy.getCategories.and.returnValue(of(categories));
    catalogServiceSpy.getProducts.and.returnValue(of([]));
    createComponent();

    expect(fixture.nativeElement.textContent).toContain('No hay productos publicados.');
  });

  it('muestra el error si falla la carga', () => {
    catalogServiceSpy.getCategories.and.returnValue(throwError(() => new Error('boom')));
    catalogServiceSpy.getProducts.and.returnValue(of([]));
    createComponent();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los datos del catálogo.');
  });
});
