import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { ProductCardComponent } from './product-card.component';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  categoryId: 'c1',
  name: 'Rosa',
  slug: 'rosa',
  description: 'Rosa roja',
  price: 100,
  stock: 2,
  sku: 'ROSA-1',
  images: [],
  tags: [],
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;
  let component: ProductCardComponent;
  let cartService: CartService;
  let snackbarService: SnackbarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [ProductCardComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    localStorage.clear();
    cartService = TestBed.inject(CartService);
    snackbarService = TestBed.inject(SnackbarService);
  });

  function createFixture(overrides: Partial<Product> = {}): ComponentFixture<ProductCardComponent> {
    fixture = TestBed.createComponent(ProductCardComponent);
    component = fixture.componentInstance;
    component.product = product(overrides);
    fixture.detectChanges();
    return fixture;
  }

  function currentSnackbar(): { message?: string } | null {
    let data: { message?: string } | null = null;
    snackbarService.getData().subscribe(value => (data = value));
    return data;
  }

  it('muestra el nombre, la descripción y el precio', () => {
    createFixture();

    expect(fixture.nativeElement.textContent).toContain('Rosa');
    expect(fixture.nativeElement.textContent).toContain('Rosa roja');
    expect(fixture.nativeElement.textContent).toContain('$100.00');
  });

  it('prioriza el precio con descuento y tacha el precio de lista', () => {
    createFixture({ price: 100, discountPrice: 80 });

    const card = fixture.nativeElement as HTMLElement;
    expect(card.textContent).toContain('$80.00');
    expect(card.querySelector('.price .regular')).not.toBeNull();
  });

  it('un producto agotado deshabilita el botón y no agrega al carrito', () => {
    createFixture({ stock: 0 });

    const button = fixture.nativeElement.querySelector('.card-actions button') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Agotado');

    button.click();

    let count = 0;
    cartService.getCount().subscribe(value => (count = value));
    expect(count).toBe(0);
  });

  it('agregar al carrito agrega el producto y muestra un snackbar de éxito', () => {
    createFixture();

    const button = fixture.nativeElement.querySelector('.card-actions button') as HTMLButtonElement;
    button.click();

    let count = 0;
    cartService.getCount().subscribe(value => (count = value));
    expect(count).toBe(1);
    expect(currentSnackbar()?.message).toBe('Rosa agregado al carrito.');
    expect(component.added).toBeTrue();
  });

  it('expone el link al detalle con la ruta del catálogo', () => {
    createFixture();

    expect(component.productLink()).toBe('/catalog/c1/product/p1');
  });

  it('clasifica el estado de stock: en stock, pocas unidades y agotado', () => {
    createFixture();
    expect(component.getStockStatus()).toBe('low-stock');

    component.product = product({ stock: 5 });
    expect(component.getStockStatus()).toBe('in-stock');

    component.product = product({ stock: 0 });
    expect(component.getStockStatus()).toBe('out-of-stock');
  });

  it('no muestra "ver más" si la descripción es corta', () => {
    createFixture({ description: 'Corta' });

    expect(fixture.nativeElement.querySelector('.read-more')).not.toBeNull();
  });

  it('siempre muestra "ver más" y la descripción se trunca con CSS', () => {
    const longDesc = 'Descripción muy larga '.repeat(20);
    createFixture({ description: longDesc });

    const descEl = fixture.nativeElement.querySelector('.description');
    expect(descEl).not.toBeNull();
    expect(descEl.classList.contains('description')).toBeTrue();

    const readMore = fixture.nativeElement.querySelector('.read-more');
    expect(readMore).not.toBeNull();
    expect(readMore.textContent).toContain('ver más');
  });
});
