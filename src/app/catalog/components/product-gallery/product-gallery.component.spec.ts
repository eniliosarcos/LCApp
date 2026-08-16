import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductImage } from '../../../core/models/product.model';
import { ProductGalleryComponent } from './product-gallery.component';

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
      declarations: [ProductGalleryComponent]
    }).compileComponents();
  });

  function createFixture(images: ProductImage[]): ComponentFixture<ProductGalleryComponent> {
    fixture = TestBed.createComponent(ProductGalleryComponent);
    component = fixture.componentInstance;
    component.images = images;
    fixture.detectChanges();
    return fixture;
  }

  it('sin imágenes muestra el fallback en la principal', () => {
    createFixture([]);

    expect(fixture.nativeElement.querySelector('.main-image img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.main-fallback').textContent).toBe('LC');
  });

  it('con imágenes muestra la principal con su URL', () => {
    createFixture([image()]);

    const img = fixture.nativeElement.querySelector('.main-image img') as HTMLImageElement;
    expect(img.src).toBe('http://img/1.jpg');
    expect(fixture.nativeElement.querySelector('.main-fallback')).toBeNull();
  });

  it('una URL rota en la principal muestra el fallback', () => {
    createFixture([image()]);

    const img = fixture.nativeElement.querySelector('.main-image img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.main-image img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.main-fallback').textContent).toBe('LC');
  });

  it('cambiar de miniatura selecciona la imagen y reintenta la principal', () => {
    const images = [image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })];
    createFixture(images);
    component.onMainImageError();
    expect(component.mainImageFailed).toBeTrue();

    component.selectImage(images[1]);

    expect(component.selectedImage).toBe(images[1]);
    expect(component.mainImageFailed).toBeFalse();
  });

  it('una miniatura rota no afecta a las demás', () => {
    const images = [image({ id: 'i1' }), image({ id: 'i2', isPrimary: false })];
    createFixture(images);

    const thumbs = fixture.nativeElement.querySelectorAll('.thumbnail');
    expect(thumbs.length).toBe(2);

    const firstThumbImg = thumbs[0].querySelector('img') as HTMLImageElement;
    firstThumbImg.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(component.thumbFailed(images[0])).toBeTrue();
    expect(fixture.nativeElement.querySelectorAll('.thumbnail img').length).toBe(1);
    expect(thumbs[0].querySelector('.thumb-fallback')).not.toBeNull();
    expect(thumbs[1].querySelector('img')).not.toBeNull();
  });

  it('la primaria se toma del isPrimary y cae a la primera imagen', () => {
    createFixture([image({ id: 'i1', isPrimary: false }), image({ id: 'i2', isPrimary: true })]);

    expect(component.getPrimaryImage()?.id).toBe('i2');
  });
});
