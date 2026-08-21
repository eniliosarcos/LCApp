import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { LOW_STOCK_THRESHOLD, Product, ProductImage } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent implements AfterViewInit, OnDestroy {
  @Input() product!: Product;
  @ViewChild('desc') descRef?: ElementRef<HTMLElement>;

  added = false;
  imageFailed = false;
  isTruncated = false;
  private addedTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly cartService: CartService,
    private readonly snackbarService: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngAfterViewInit(): void {
    const el = this.descRef?.nativeElement;
    if (el) {
      this.isTruncated = el.scrollHeight > el.clientHeight;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    if (this.addedTimer) {
      clearTimeout(this.addedTimer);
    }
  }

  addToCart(): void {
    if (this.product.stock === 0) {
      return;
    }
    this.cartService.addItem(this.product);
    this.added = true;
    this.snackbarService.show(`${this.product.name} agregado al carrito.`, 'success');
    this.cdr.markForCheck();
    this.addedTimer = setTimeout(() => {
      this.added = false;
      this.cdr.markForCheck();
    }, 1500);
  }

  isOutOfStock(): boolean {
    return this.product.stock === 0;
  }

  getStockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (this.product.stock > LOW_STOCK_THRESHOLD) {
      return 'in-stock';
    }
    if (this.product.stock > 0) {
      return 'low-stock';
    }
    return 'out-of-stock';
  }

  getDisplayPrice(): number {
    return this.product.discountPrice ?? this.product.price;
  }

  productLink(): string {
    return `/catalog/${this.product.categoryId}/product/${this.product.id}`;
  }

  getPrimaryImage(): ProductImage | undefined {
    return this.product.images?.find(img => img.isPrimary && img.url) ?? this.product.images?.find(img => img.url);
  }

  onImageError(): void {
    this.imageFailed = true;
    this.cdr.markForCheck();
  }

  getSrcset(image: ProductImage): string {
    if (!image.variants?.length) return '';
    return image.variants.map(v => `${v.url} ${v.width}w`).join(', ');
  }
}
