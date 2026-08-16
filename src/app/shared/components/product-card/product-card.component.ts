import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { LOW_STOCK_THRESHOLD, Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent implements OnDestroy {
  @Input() product!: Product;

  added = false;
  private addedTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly cartService: CartService,
    private readonly snackbarService: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

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
}
