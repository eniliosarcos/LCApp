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

  zoomScale = 1;
  panX = 0;
  panY = 0;

  private initialDistance = 0;
  private initialScale = 1;
  private initialPanX = 0;
  private initialPanY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private lastTap = 0;

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
    this.resetZoom();
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
    this.resetZoom();
    this.cdr.markForCheck();
  }

  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.resetZoom();
    this.cdr.markForCheck();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeLightbox();
    if (event.key === 'ArrowLeft') this.prev();
    if (event.key === 'ArrowRight') this.next();
  }

  onZoomStart(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      this.initialDistance = this.getDistance(event.touches[0], event.touches[1]);
      this.initialScale = this.zoomScale;
      this.initialPanX = this.panX;
      this.initialPanY = this.panY;
    } else if (event.touches.length === 1) {
      const now = Date.now();
      if (now - this.lastTap < 300) {
        this.toggleZoom();
      }
      this.lastTap = now;

      if (this.zoomScale > 1) {
        this.panStartX = event.touches[0].clientX;
        this.panStartY = event.touches[0].clientY;
        this.initialPanX = this.panX;
        this.initialPanY = this.panY;
      }
    }
  }

  onZoomMove(event: TouchEvent): void {
    if (event.touches.length === 2) {
      event.preventDefault();
      const distance = this.getDistance(event.touches[0], event.touches[1]);
      this.zoomScale = Math.min(Math.max(this.initialScale * (distance / this.initialDistance), 1), 4);

      if (this.zoomScale === 1) {
        this.panX = 0;
        this.panY = 0;
      }
    } else if (event.touches.length === 1 && this.zoomScale > 1) {
      event.preventDefault();
      this.panX = this.initialPanX + (event.touches[0].clientX - this.panStartX);
      this.panY = this.initialPanY + (event.touches[0].clientY - this.panStartY);
    }
  }

  onZoomEnd(): void {
    this.initialDistance = 0;
    if (this.zoomScale <= 1) {
      this.zoomScale = 1;
      this.panX = 0;
      this.panY = 0;
    }
  }

  private toggleZoom(): void {
    this.zoomScale = this.zoomScale > 1 ? 1 : 2;
    if (this.zoomScale === 1) {
      this.panX = 0;
      this.panY = 0;
    }
    this.cdr.markForCheck();
  }

  private resetZoom(): void {
    this.zoomScale = 1;
    this.panX = 0;
    this.panY = 0;
  }

  private getDistance(t1: Touch, t2: Touch): number {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }
}
