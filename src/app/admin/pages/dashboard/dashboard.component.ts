import { Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { Order, OrderStats } from '../../../core/models/order.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  categories: Category[] = [];
  products: Product[] = [];
  orders: Order[] = [];
  stats: OrderStats | null = null;
  loading = true;
  error = false;
  errorMessage = '';
  actionError = '';

  constructor(
    private readonly catalogService: CatalogService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe({
      next: categories => (this.categories = categories),
      error: () => (this.error = true)
    });
    this.catalogService.getProducts().subscribe({
      next: products => (this.products = products),
      error: () => (this.error = true)
    });
    this.loadOrders();
  }

  categoryName(categoryId: string): string {
    return this.categories.find(category => category.id === categoryId)?.name ?? '-';
  }

  orderTrackBy(_index: number, order: Order): string {
    return order.id;
  }

  itemTrackBy(_index: number, item: { productId: string }): string {
    return item.productId;
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }

  confirmOrder(order: Order): void {
    this.actionError = '';
    this.orderService.confirmOrder(order.id).subscribe({
      next: updated => {
        order.status = updated.status;
        order.confirmedAt = updated.confirmedAt;
        this.loadOrders();
      },
      error: (err: Error) => (this.actionError = err.message)
    });
  }

  cancelOrder(order: Order): void {
    this.actionError = '';
    this.orderService.cancelOrder(order.id).subscribe({
      next: updated => {
        order.status = updated.status;
        this.loadOrders();
      },
      error: (err: Error) => (this.actionError = err.message)
    });
  }

  private loadOrders(): void {
    this.loading = true;
    this.orderService.getStats().subscribe({
      next: stats => (this.stats = stats)
    });
    this.orderService.getOrders().subscribe({
      next: orders => (this.orders = orders),
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.loading = false;
      },
      complete: () => (this.loading = false)
    });
  }
}
