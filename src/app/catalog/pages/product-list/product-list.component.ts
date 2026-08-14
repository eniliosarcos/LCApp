import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { Category } from '../../../core/models/category.model';
import { LOW_STOCK_THRESHOLD, Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
  category?: Category;
  products: Product[] = [];
  addedProductIds: Set<string> = new Set();
  loading = true;
  error = false;
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', link: '/' },
    { label: 'Productos', link: '' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService,
    private readonly cartService: CartService,
    private readonly snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    const categoryId = this.route.snapshot.paramMap.get('categoryId');
    if (categoryId) {
      this.catalogService.getCategoryById(categoryId).subscribe(category => {
        this.category = category;
        if (category) {
          this.breadcrumbItems = [
            { label: 'Inicio', link: '/' },
            { label: category.name, link: '' }
          ];
        }
      });
      this.catalogService.getProductsByCategory(categoryId).subscribe({
        next: products => {
          this.products = products;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.error = true;
        }
      });
    } else {
      this.loading = false;
    }
  }

  addToCart(product: Product): void {
    if (product.stock === 0) {
      return;
    }
    this.cartService.addItem(product);
    this.addedProductIds.add(product.id);
    this.snackbarService.show(`${product.name} agregado al carrito.`, 'success');
    setTimeout(() => this.addedProductIds.delete(product.id), 1500);
  }

  isAdded(productId: string): boolean {
    return this.addedProductIds.has(productId);
  }

  isOutOfStock(product: Product): boolean {
    return product.stock === 0;
  }

  getStockStatus(product: Product): 'in-stock' | 'low-stock' | 'out-of-stock' {
    if (product.stock > LOW_STOCK_THRESHOLD) {
      return 'in-stock';
    }
    if (product.stock > 0) {
      return 'low-stock';
    }
    return 'out-of-stock';
  }

  getDisplayPrice(product: Product): number {
    return product.discountPrice ?? product.price;
  }

  productLink(product: Product): string {
    return `/catalog/${product.categoryId}/product/${product.id}`;
  }
}
