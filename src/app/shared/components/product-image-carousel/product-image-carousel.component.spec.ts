import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProductImage } from '../../../core/models/product.model';
import { ProductImageCarouselComponent } from './product-image-carousel.component';

const image = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  id: 'i1',
  url: 'http://img/1.jpg',
  alt: 'Foto 1',
  isPrimary: true,
  order: 0,
  ...overrides
});

describe('ProductImageCarouselComponent', () => {
  let fixture: ComponentFixture<ProductImageCarouselComponent>;
  let component: ProductImageCarouselComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductImageCarouselComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  function createFixture(images: ProductImage[] = []): ComponentFixture<ProductImageCarouselComponent> {
    fixture = TestBed.createComponent(ProductImageCarouselComponent);
    component = fixture.componentInstance;
    component.images = images;
    fixture.detectChanges();
    return fixture;
  }

  it('hasMultiple es false con 0 imágenes', () => {
    createFixture([]);
    expect(component.hasMultiple).toBeFalse();
  });

  it('hasMultiple es false con 1 imagen', () => {
    createFixture([image()]);
    expect(component.hasMultiple).toBeFalse();
  });

  it('hasMultiple es true con 2+ imágenes', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);
    expect(component.hasMultiple).toBeTrue();
  });

  it('con 1 imagen muestra solo <img> sin carousel', () => {
    createFixture([image()]);

    const img = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('http://img/1.jpg');
    expect(fixture.nativeElement.querySelector('.carousel')).toBeNull();
  });

  it('con 2+ imágenes muestra carousel con dots', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    const carousel = fixture.nativeElement.querySelector('.carousel');
    expect(carousel).not.toBeNull();
    const dots = fixture.nativeElement.querySelectorAll('.carousel__dot');
    expect(dots.length).toBe(2);
  });

  it('goTo cambia el currentIndex', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    component.goTo(1);
    expect(component.currentIndex).toBe(1);
  });

  it('next avanza circularmente entre las imágenes', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false }), image({ id: 'i3', isPrimary: false })]);

    component.next();
    expect(component.currentIndex).toBe(1);

    component.next();
    expect(component.currentIndex).toBe(2);

    component.next();
    expect(component.currentIndex).toBe(0);
  });

  it('genera srcset a partir de las variantes', () => {
    const variants = [
      { width: 400, url: 'https://img/400w.webp' },
      { width: 800, url: 'https://img/800w.webp' }
    ];
    createFixture([image({ variants })]);

    expect(component.getSrcset(component.images[0])).toBe(
      'https://img/400w.webp 400w, https://img/800w.webp 800w'
    );
  });

  it('getSrcset retorna string vacío sin variantes', () => {
    createFixture([image()]);
    expect(component.getSrcset(component.images[0])).toBe('');
  });

  it('isPaused se activa con pointerenter y se desactiva con pointerleave', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    expect(component.isPaused).toBeFalse();

    component.onPointerEnter();
    expect(component.isPaused).toBeTrue();

    component.onPointerLeave();
    expect(component.isPaused).toBeFalse();
  });

  it('dot activo tiene la clase carousel__dot--active', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    const dots = fixture.nativeElement.querySelectorAll('.carousel__dot');
    expect(dots[0].classList.contains('carousel__dot--active')).toBeTrue();
    expect(dots[1].classList.contains('carousel__dot--active')).toBeFalse();
  });
});
