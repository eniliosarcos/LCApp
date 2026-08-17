import { Component, Input, OnInit } from '@angular/core';
import { ProductImage } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-gallery',
  templateUrl: './product-gallery.component.html',
  styleUrls: ['./product-gallery.component.scss']
})
export class ProductGalleryComponent implements OnInit {
  @Input() images: ProductImage[] = [];
  selectedImage: ProductImage | null = null;
  mainImageFailed = false;
  failedThumbs = new Set<string>();

  ngOnInit(): void {
    this.selectedImage = this.getPrimaryImage();
  }

  getPrimaryImage(): ProductImage | null {
    return this.images.find(img => img.isPrimary) || this.images[0] || null;
  }

  get hasImages(): boolean {
    return this.images.length > 0;
  }

  get fallback(): string {
    return 'LC';
  }

  get mainImage(): ProductImage | null {
    return this.selectedImage || this.getPrimaryImage();
  }

  get mainSrcset(): string {
    const variants = this.mainImage?.variants;
    if (!variants || variants.length === 0) {
      return '';
    }
    return variants
      .map(variant => `${variant.url} ${variant.width}w`)
      .join(', ');
  }

  thumbFailed(image: ProductImage): boolean {
    return this.failedThumbs.has(image.id);
  }

  selectImage(image: ProductImage): void {
    this.selectedImage = image;
    this.mainImageFailed = false;
  }

  onMainImageError(): void {
    this.mainImageFailed = true;
  }

  onThumbImageError(image: ProductImage): void {
    this.failedThumbs.add(image.id);
  }
}
