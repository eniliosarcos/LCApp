import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { ProductListComponent } from './product-list.component';

const productA: Product = {
  id: 'p1',
  categoryId: 'c1',
  name: 'Rosa',
  slug: 'rosa',
  description: 'Rosa roja',
  price: 100,
  stock: 10,
  sku: 'ROSA-1',
  images: [],
  tags: [],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

const productB: Product = { ...productA, id: 'p2', name: 'Tulipán', slug: 'tulipan' };

const category: Category = { id: 'c1', name: 'Rosas', slug: 'rosas', description: 'Rosas y flores' };

function mockParamMap(categoryId: string | null) {
  return { get: (key: string) => (key === 'categoryId' ? categoryId : null) };
}

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let catalogService: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getCategoryById', 'getProductsByCategory']);
    catalogService.getCategoryById.and.returnValue(of(category));
    catalogService.getProductsByCategory.and.returnValue(of([productA, productB]));

    await TestBed.configureTestingModule({
      declarations: [ProductListComponent],
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: ActivatedRoute, useValue: { paramMap: of(mockParamMap('c1')) } }
      ]
    }).compileComponents();
  });

  function createFixture(): ComponentFixture<ProductListComponent> {
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  it('carga la categoría y los productos al iniciar', () => {
    createFixture();

    expect(catalogService.getCategoryById).toHaveBeenCalledWith('c1');
    expect(catalogService.getProductsByCategory).toHaveBeenCalledWith('c1');
    expect(component.products).toEqual([productA, productB]);
    expect(component.loading).toBeFalse();
    expect(component.error).toBeFalse();
  });

  it('muestra el nombre de la categoría en el título', () => {
    createFixture();

    expect(fixture.nativeElement.querySelector('h1').textContent).toContain('Rosas');
  });

  it('muestra un error visible si falla la carga de productos', () => {
    catalogService.getProductsByCategory.and.returnValue(throwError(() => new Error('boom')));
    createFixture();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los productos');
  });

  it('muestra un mensaje cuando la categoría no tiene productos', () => {
    catalogService.getProductsByCategory.and.returnValue(of([]));
    createFixture();

    expect(component.products).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No hay productos en esta categoría.');
  });

  it('sin categoryId no carga nada y deja de mostrar el cargador', () => {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { paramMap: of(mockParamMap(null)) } });
    createFixture();

    expect(catalogService.getProductsByCategory).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  describe('búsqueda', () => {
    it('filtra productos por nombre', () => {
      createFixture();
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'Tulipán';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Tulipán');
    });

    it('normaliza tildes al buscar', () => {
      catalogService.getProductsByCategory.and.returnValue(of([
        { ...productA, name: 'Maquíllaje Premium' },
        productB
      ]));
      createFixture();
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'maquillaje';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Maquíllaje Premium');
    });

    it('muestra mensaje cuando la búsqueda no coincide', () => {
      createFixture();
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'inexistente';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No se encontraron productos para "inexistente"');
    });
  });
});
