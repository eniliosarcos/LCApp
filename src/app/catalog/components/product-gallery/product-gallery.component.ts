import { ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { ProductImage } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-gallery',
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.scss']
})
export class ProductGalleryComponent implements OnDestroy {
  @Input() images: ProductImage[] = [];

  currentIndex = 0;
  lightboxOpen = false;
  lightboxClosing = false;
  failedThumbs = new Set<string>();

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    if (this.lightboxOpen) {
      document.body.style.overflow = '';
    }
  }

  get hasImages(): boolean {
    return this.images.length > 0;
  }

  get hasMultiple(): boolean {
    return this.images.length > 1;
  }

  get currentImage(): ProductImage | undefined {
    return this.images[this.currentIndex];
  }

  get fallback(): string {
    return 'LC';
  }

  getSrcset(image: ProductImage): string {
    if (!image.variants?.length) return '';
    return image.variants.map(v => `${v.url} ${v.width}w`).join(', ');
  }

  selectImage(index: number): void {
    this.currentIndex = index;
    this.cdr.markForCheck();
  }

  thumbFailed(image: ProductImage): boolean {
    return this.failedThumbs.has(image.id);
  }

  onThumbError(image: ProductImage): void {
    this.failedThumbs.add(image.id);
    this.cdr.markForCheck();
  }

  openLightbox(): void {
    this.lightboxOpen = true;
    document.body.style.overflow = 'hidden';
    this.cdr.markForCheck();
  }

  closeLightbox(): void {
    this.lightboxClosing = true;
    setTimeout(() => {
      this.lightboxOpen = false;
      this.lightboxClosing = false;
      document.body.style.overflow = '';
      this.cdr.markForCheck();
    }, 150);
    this.cdr.markForCheck();
  }

  prev(): void {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.cdr.markForCheck();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'ArrowRight') this.next();
  }
}
