import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { HomeComponent } from './home.component';

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

const productB: Product = { ...productA, id: 'p2', name: 'Tulipán', categoryId: 'c2', slug: 'tulipan' };

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let catalogService: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getProducts']);
    catalogService.getProducts.and.returnValue(of([productA, productB]));

    await TestBed.configureTestingModule({
      declarations: [HomeComponent],
      imports: [FormsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [{ provide: CatalogService, useValue: catalogService }]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga todos los productos al iniciar', () => {
    expect(catalogService.getProducts).toHaveBeenCalled();
    expect(component.products).toEqual([productA, productB]);
  });

  it('muestra un mensaje cuando no hay productos', () => {
    catalogService.getProducts.and.returnValue(of([]));
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.products).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No hay productos en esta categoría.');
  });

  it('muestra un error visible si falla la carga de productos', () => {
    catalogService.getProducts.and.returnValue(throwError(() => new Error('boom')));
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.error).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('No se pudieron cargar los productos');
  });

  describe('búsqueda', () => {
    it('filtra productos por nombre', () => {
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'Tulipán';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Tulipán');
    });

    it('normaliza tildes al buscar', () => {
      catalogService.getProducts.and.returnValue(of([
        { ...productA, name: 'Maquíllaje Premium' },
        productB
      ]));
      fixture = TestBed.createComponent(HomeComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'maquillaje';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.filteredProducts.length).toBe(1);
      expect(component.filteredProducts[0].name).toBe('Maquíllaje Premium');
    });

    it('muestra mensaje cuando la búsqueda no coincide', () => {
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'inexistente';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No se encontraron productos para "inexistente"');
    });
  });
});
