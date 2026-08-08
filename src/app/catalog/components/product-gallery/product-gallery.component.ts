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

  selectImage(image: ProductImage): void {
    this.selectedImage = image;
  }
}
