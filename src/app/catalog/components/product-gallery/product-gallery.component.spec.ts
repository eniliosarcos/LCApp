import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ProductImage } from '../../../core/models/product.model';
import { ProductGalleryComponent } from './product-gallery.component';

import { fakeAsync, tick } from '@angular/core/testing';

const image = (overrides: Partial<ProductImage> = {}): ProductImage => ({
  id: 'i1',
  url: 'http://img/1.jpg',
  alt: 'Rosa',
  isPrimary: true,
  order: 0,
  ...overrides
});

describe('ProductGalleryComponent', () => {
  let fixture: ComponentFixture<ProductGalleryComponent>;
  let component: ProductGalleryComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProductGalleryComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  function createFixture(images: ProductImage[]): ComponentFixture<ProductGalleryComponent> {
    fixture = TestBed.createComponent(ProductGalleryComponent);
    component = fixture.componentInstance;
    component.images = images;
    fixture.detectChanges();
    return fixture;
  }

  it('sin imágenes muestra el fallback', () => {
    createFixture([]);

    expect(fixture.nativeElement.querySelector('.main-fallback').textContent).toBe('LC');
    expect(fixture.nativeElement.querySelector('.main-image__img')).toBeNull();
  });

  it('con 1 imagen muestra la imagen sin thumbnails', () => {
    createFixture([image()]);

    const img = fixture.nativeElement.querySelector('.main-image__img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain('http://img/1.jpg');
    expect(fixture.nativeElement.querySelector('.thumbs')).toBeNull();
  });

  it('con 2+ imágenes muestra thumbnails', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', url: 'http://img/2.jpg', isPrimary: false })]);

    const thumbs = fixture.nativeElement.querySelectorAll('.thumb');
    expect(thumbs.length).toBe(2);
  });

  it('selectImage cambia el currentIndex', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    component.selectImage(1);
    expect(component.currentIndex).toBe(1);
  });

  it('hasImages retorna true cuando hay imágenes', () => {
    createFixture([image()]);
    expect(component.hasImages).toBeTrue();
  });

  it('hasImages retorna false cuando no hay imágenes', () => {
    createFixture([]);
    expect(component.hasImages).toBeFalse();
  });

  it('hasMultiple retorna true con 2+ imágenes', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);
    expect(component.hasMultiple).toBeTrue();
  });

  it('hasMultiple retorna false con 1 imagen', () => {
    createFixture([image()]);
    expect(component.hasMultiple).toBeFalse();
  });

  it('fallback retorna LC', () => {
    createFixture([]);
    expect(component.fallback).toBe('LC');
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

  it('openLightbox activa lightboxOpen', () => {
    createFixture([image()]);

    component.openLightbox();
    fixture.detectChanges();
    expect(component.lightboxOpen).toBeTrue();
    expect(fixture.nativeElement.querySelector('.lightbox')).not.toBeNull();
  });

  it('closeLightbox desactiva lightboxOpen', fakeAsync(() => {
    createFixture([image()]);

    component.openLightbox();
    fixture.detectChanges();
    component.closeLightbox();
    tick(150);
    fixture.detectChanges();
    expect(component.lightboxOpen).toBeFalse();
    expect(fixture.nativeElement.querySelector('.lightbox')).toBeNull();
  }));

  it('prev() retrocede circularmente', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false }), image({ id: 'i3', isPrimary: false })]);

    component.prev();
    expect(component.currentIndex).toBe(2);

    component.prev();
    expect(component.currentIndex).toBe(1);
  });

  it('next() avanza circularmente', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false }), image({ id: 'i3', isPrimary: false })]);

    component.next();
    expect(component.currentIndex).toBe(1);

    component.next();
    expect(component.currentIndex).toBe(2);

    component.next();
    expect(component.currentIndex).toBe(0);
  });

  it('thumb activo tiene la clase thumb--active', () => {
    createFixture([image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })]);

    const thumbs = fixture.nativeElement.querySelectorAll('.thumb');
    expect(thumbs[0].classList.contains('thumb--active')).toBeTrue();
    expect(thumbs[1].classList.contains('thumb--active')).toBeFalse();
  });

  it('onThumbError agrega a failedThumbs', () => {
    createFixture([image()]);

    expect(component.thumbFailed(component.images[0])).toBeFalse();
    component.onThumbError(component.images[0]);
    expect(component.thumbFailed(component.images[0])).toBeTrue();
  });
});
