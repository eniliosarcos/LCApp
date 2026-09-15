import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { Category } from '../../../core/models/category.model';
import { LOW_STOCK_THRESHOLD, Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { ContactService } from '../../../core/services/contact.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { buildProductWhatsAppMessage, buildWhatsAppHref } from '../../../core/utils/whatsapp';

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
  whatsapp = '';
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', link: '/' },
    { label: 'Producto', link: '' }
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService,
    private readonly cartService: CartService,
    private readonly snackbarService: SnackbarService,
    private readonly contactService: ContactService
  ) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.whatsapp = config.whatsapp;
    });
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
    if (this.product.stock > LOW_STOCK_THRESHOLD) {
      return 'in-stock';
    }
    if (this.product.stock > 0) {
      return 'low-stock';
    }
    return 'out-of-stock';
  }

  getDisplayPrice(): number {
    if (!this.product) {
      return 0;
    }
    return this.product.discountPrice ?? this.product.price;
  }

  getWhatsAppHref(): string {
    const price = this.getDisplayPrice();
    const message = buildProductWhatsAppMessage({
      name: this.product?.name ?? 'Producto',
      price,
      url: window.location.href
    });
    return buildWhatsAppHref(this.whatsapp, message);
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
