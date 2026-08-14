import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { ProductListComponent } from './product-list.component';

const product: Product = {
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

describe('ProductListComponent', () => {
  let component: ProductListComponent;
  let fixture: ComponentFixture<ProductListComponent>;
  let cartService: CartService;
  let snackbarService: SnackbarService;
  let catalogService: jasmine.SpyObj<CatalogService>;

  beforeEach(async () => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getCategoryById', 'getProductsByCategory']);
    catalogService.getCategoryById.and.returnValue(of(undefined));
    catalogService.getProductsByCategory.and.returnValue(of([product]));

    await TestBed.configureTestingModule({
      declarations: [ProductListComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }
      ]
    }).compileComponents();

    localStorage.clear();
    cartService = TestBed.inject(CartService);
    snackbarService = TestBed.inject(SnackbarService);
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function currentSnackbar(): { message?: string } | null {
    let data: { message?: string } | null = null;
    snackbarService.getData().subscribe(value => (data = value));
    return data;
  }

  it('agregar al carrito agrega el producto y mantiene el estado local', () => {
    component.addToCart(product);

    expect(component.isAdded('p1')).toBeTrue();
    let count = 0;
    cartService.getCount().subscribe(value => (count = value));
    expect(count).toBe(1);
  });

  it('agregar al carrito muestra un snackbar de éxito con el nombre', () => {
    component.addToCart(product);

    expect(currentSnackbar()?.message).toBe('Rosa agregado al carrito.');
  });

  it('un producto agotado no se agrega al carrito', () => {
    const soldOut: Product = { ...product, stock: 0 };

    component.addToCart(soldOut);

    expect(component.isAdded('p1')).toBeFalse();
    expect(component.isOutOfStock(soldOut)).toBeTrue();
    let count = 0;
    cartService.getCount().subscribe(value => (count = value));
    expect(count).toBe(0);
  });

  it('clasifica el estado de stock: en stock, pocas unidades y agotado', () => {
    expect(component.getStockStatus({ ...product, stock: 11 })).toBe('in-stock');
    expect(component.getStockStatus({ ...product, stock: 10 })).toBe('low-stock');
    expect(component.getStockStatus({ ...product, stock: 1 })).toBe('low-stock');
    expect(component.getStockStatus({ ...product, stock: 0 })).toBe('out-of-stock');
  });
});
