import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  category: Category | null = null;
  loading = true;
  loadError = false;
  quantity = 1;
  addedToCart = false;
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', link: '/' },
    { label: 'Producto', link: '' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService,
    private readonly cartService: CartService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('productId');
    const categoryId = this.route.snapshot.paramMap.get('categoryId');
    if (productId) {
      this.loadProduct(productId, categoryId);
    }
  }

  getDiscountPercentage(): number {
    if (!this.product?.discountPrice) {
      return 0;
    }
    return Math.round(((this.product.price - this.product.discountPrice) / this.product.price) * 100);
  }

  getStockStatus(): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (!this.product) {
      return 'out-of-stock';
    }
    if (this.product.stock > 10) {
      return 'in-stock';
    }
    if (this.product.stock > 0) {
      return 'low-stock';
    }
    return 'out-of-stock';
  }

  addToCart(): void {
    if (this.product && this.quantity > 0) {
      this.cartService.addItem(this.product, this.quantity);
      this.addedToCart = true;
      this.snackbarService.show(`${this.product.name} agregado al carrito.`, 'success');
      setTimeout(() => (this.addedToCart = false), 3000);
    }
  }

  private loadProduct(productId: string, categoryId: string | null): void {
    if (categoryId) {
      this.catalogService.getCategoryById(categoryId).subscribe(category => {
        if (category) {
          this.category = category;
          this.updateBreadcrumb();
        }
      });
    }
    this.catalogService.getProductById(productId).subscribe({
      next: product => {
        if (product) {
          this.product = product;
          this.updateBreadcrumb();
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  private updateBreadcrumb(): void {
    const categoryId = this.route.snapshot.paramMap.get('categoryId');
    const items: BreadcrumbItem[] = [{ label: 'Inicio', link: '/' }];
    if (this.category) {
      items.push({ label: this.category.name, link: `/catalog/${categoryId}` });
    }
    items.push({ label: this.product?.name ?? 'Producto', link: '' });
    this.breadcrumbItems = items;
  }
}
