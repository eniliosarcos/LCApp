import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ContactService } from '../../../core/services/contact.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { ProductDetailComponent } from './product-detail.component';

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

describe('ProductDetailComponent', () => {
  let component: ProductDetailComponent;
  let fixture: ComponentFixture<ProductDetailComponent>;
  let cartService: CartService;
  let snackbarService: SnackbarService;
  let catalogService: jasmine.SpyObj<CatalogService>;
  let contactService: jasmine.SpyObj<ContactService>;

  beforeEach(async () => {
    catalogService = jasmine.createSpyObj('CatalogService', ['getProductById', 'getCategoryById']);
    catalogService.getProductById.and.returnValue(of(product));
    catalogService.getCategoryById.and.returnValue(of(undefined));
    contactService = jasmine.createSpyObj('ContactService', ['getContact']);
    contactService.getContact.and.returnValue(of({ whatsapp: '521234567890', whatsappDisplay: '', instagram: '', telegram: '' }));

    await TestBed.configureTestingModule({
      declarations: [ProductDetailComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CatalogService, useValue: catalogService },
        { provide: ContactService, useValue: contactService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'p1' } } } }
      ]
    }).compileComponents();

    localStorage.clear();
    cartService = TestBed.inject(CartService);
    snackbarService = TestBed.inject(SnackbarService);
    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function currentSnackbar(): { message?: string } | null {
    let data: { message?: string } | null = null;
    snackbarService.getData().subscribe(value => (data = value));
    return data;
  }

  it('agregar al carrito agrega el producto y mantiene el feedback local', () => {
    component.addToCart();

    expect(component.addedToCart).toBeTrue();
    let count = 0;
    cartService.getCount().subscribe(value => (count = value));
    expect(count).toBe(1);
  });

  it('agregar al carrito muestra un snackbar de éxito con el nombre', () => {
    component.addToCart();

    expect(currentSnackbar()?.message).toBe('Rosa agregado al carrito.');
  });

  it('muestra el enlace de WhatsApp con el nombre y el precio del producto', () => {
    const link = fixture.nativeElement.querySelector('.whatsapp-link') as HTMLAnchorElement;

    expect(link).not.toBeNull();
    const expectedText = encodeURIComponent('Hola! Me interesa el producto: Rosa - $100.00');
    expect(link.getAttribute('href')).toBe(`https://wa.me/521234567890?text=${expectedText}`);
  });

  it('usa el precio con descuento en el mensaje si existe', () => {
    component.product = { ...product, discountPrice: 80 };
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.whatsapp-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toContain(encodeURIComponent('Rosa - $80.00'));
  });

  it('oculta el enlace de WhatsApp sin número configurado', () => {
    contactService.getContact.and.returnValue(of({ whatsapp: '', whatsappDisplay: '', instagram: '', telegram: '' }));
    fixture = TestBed.createComponent(ProductDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.whatsapp-link')).toBeNull();
  });
});
