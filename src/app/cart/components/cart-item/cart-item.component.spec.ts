import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Product } from '../../../core/models/product.model';
import { CartItem } from '../../../core/models/cart.model';
import { CurrencyFormatPipe } from '../../../shared/pipes/currency-format.pipe';
import { CartItemComponent } from './cart-item.component';

const product = (overrides: Partial<Product> = {}): Product => ({
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
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
});

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: 'p1',
  product: product(),
  quantity: 2,
  ...overrides
});

describe('CartItemComponent', () => {
  let fixture: ComponentFixture<CartItemComponent>;
  let component: CartItemComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CartItemComponent, CurrencyFormatPipe]
    }).compileComponents();
  });

  function createFixture(cartItem: CartItem): ComponentFixture<CartItemComponent> {
    fixture = TestBed.createComponent(CartItemComponent);
    component = fixture.componentInstance;
    component.item = cartItem;
    fixture.detectChanges();
    return fixture;
  }

  it('sin imagen muestra el fallback con la inicial', () => {
    createFixture(item());

    expect(fixture.nativeElement.querySelector('.media img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.media .fallback').textContent).toBe('R');
  });

  it('con imagen muestra la primera imagen del producto', () => {
    createFixture(item({ product: product({ images: [{ id: 'i1', url: 'http://img/1.jpg', alt: 'Rosa', isPrimary: true, order: 0 }] }) }));

    const img = fixture.nativeElement.querySelector('.media img') as HTMLImageElement;
    expect(img.src).toBe('http://img/1.jpg');
    expect(fixture.nativeElement.querySelector('.media .fallback')).toBeNull();
  });

  it('una URL rota muestra el fallback con la inicial', () => {
    createFixture(item({ product: product({ images: [{ id: 'i1', url: 'http://img/1.jpg', alt: 'Rosa', isPrimary: true, order: 0 }] }) }));

    const img = fixture.nativeElement.querySelector('.media img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.media img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.media .fallback').textContent).toBe('R');
  });

  it('emitir actualización de cantidad respeta el stock', () => {
    createFixture(item({ quantity: 9, product: product({ stock: 10 }) }));
    let payload: unknown = null;
    component.updateQuantity.subscribe(value => (payload = value));

    component.increaseQuantity();

    expect(payload).toEqual({ productId: 'p1', quantity: 10 });
  });

  it('emitir remoción con el id del producto', () => {
    createFixture(item());
    let emitted = '';
    component.remove.subscribe(value => (emitted = value));

    component.onRemove();

    expect(emitted).toBe('p1');
  });
});
