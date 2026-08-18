import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { Category } from '../../../core/models/category.model';
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

const categories: Category[] = [
  { id: 'c1', name: 'Rosas', slug: 'rosas', description: 'Rosas y flores' },
  { id: 'c2', name: 'Tulipanes', slug: 'tulipanes', description: 'Tulipanes' }
];

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let catalogService: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getCategories', 'getProducts', 'getProductsByCategory']);
    catalogService.getCategories.and.returnValue(of(categories));
    catalogService.getProducts.and.returnValue(of([productA, productB]));
    catalogService.getProductsByCategory.and.returnValue(of([productA]));

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

  function chips(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.chip')) as HTMLElement[];
  }

  it('muestra "Todos" activo por defecto y carga todos los productos', () => {
    expect(catalogService.getProducts).toHaveBeenCalled();
    expect(component.selectedCategoryId).toBe('');
    expect(component.products).toEqual([productA, productB]);
    expect(chips()[0].textContent).toContain('Todos');
    expect(chips()[0].classList).toContain('chip--active');
  });

  it('muestra las categorías en la cinta después de "Todos"', () => {
    expect(chips().length).toBe(3);
    expect(chips()[1].textContent).toContain('Rosas');
    expect(chips()[2].textContent).toContain('Tulipanes');
  });

  it('seleccionar una categoría recarga los productos y activa su chip', () => {
    fixture.nativeElement.querySelectorAll('.chip')[1].click();
    fixture.detectChanges();

    expect(catalogService.getProductsByCategory).toHaveBeenCalledWith('c1');
    expect(component.products).toEqual([productA]);
    expect(component.selectedCategoryId).toBe('c1');
    expect(fixture.nativeElement.querySelectorAll('.chip')[1].classList).toContain('chip--active');
  });

  it('volver a "Todos" recarga todos los productos', () => {
    fixture.nativeElement.querySelectorAll('.chip')[1].click();
    fixture.detectChanges();

    fixture.nativeElement.querySelectorAll('.chip')[0].click();
    fixture.detectChanges();

    expect(catalogService.getProducts).toHaveBeenCalled();
    expect(component.products).toEqual([productA, productB]);
    expect(component.selectedCategoryId).toBe('');
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

  it('expone el nombre de la categoría seleccionada', () => {
    expect(component.selectedCategoryName).toBe('Todos los productos');
    component.selectCategory('c2');
    expect(component.selectedCategoryName).toBe('Tulipanes');
  });

  it('scrollea la cinta al pulsar una flecha', () => {
    const el = component.stripScroll?.nativeElement as HTMLElement;
    const spy = spyOn(el, 'scrollBy') as jasmine.Spy;
    component.scrollStrip(1);
    expect(spy).toHaveBeenCalledWith({ left: 320, behavior: 'smooth' });
    component.scrollStrip(-1);
    expect(spy).toHaveBeenCalledWith({ left: -320, behavior: 'smooth' });
  });

  it('scrollear sin cinta disponible no rompe', () => {
    component.stripScroll = undefined;
    expect(() => component.scrollStrip(1)).not.toThrow();
  });

  it('al seleccionar una categoría centra el tab activo', () => {
    const el = component.stripScroll?.nativeElement as HTMLElement;
    const lastChip = el.querySelectorAll<HTMLButtonElement>('.chip')[2];
    const spy = spyOn(lastChip, 'scrollIntoView');

    component.selectCategory('c2');

    expect(spy).toHaveBeenCalledWith({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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

    it('persiste el término al cambiar de categoría', () => {
      const input = fixture.nativeElement.querySelector('.search-bar input');
      input.value = 'Rosa';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      expect(component.filteredProducts.length).toBe(1);

      fixture.nativeElement.querySelectorAll('.chip')[0].click();
      fixture.detectChanges();

      expect(component.searchTerm).toBe('Rosa');
      expect(component.filteredProducts.length).toBe(1);
    });
  });
});
