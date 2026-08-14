import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Order, OrderPage, OrderStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  statusFilter: 'all' | OrderStatus = 'all';
  searchTerm = '';
  page = 1;
  total = 0;
  totalPages = 0;
  loading = true;
  errorMessage = '';
  actionError = '';
  readonly pageSize = PAGE_SIZE;
  private readonly search$ = new Subject<string>();

  constructor(
    private readonly orderService: OrderService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe(() => {
        this.page = 1;
        this.loadOrders();
      });
    this.loadOrders();
  }

  orderTrackBy(_index: number, order: Order): string {
    return order.id;
  }

  itemTrackBy(_index: number, item: { productId: string }): string {
    return item.productId;
  }

  goToDetail(order: Order): void {
    this.router.navigate(['/admin/orders/detail', order.code]);
  }

  onFilterChange(status: 'all' | OrderStatus): void {
    this.statusFilter = status;
    this.page = 1;
    this.loadOrders();
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.search$.next(value);
  }

  get searchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  goToPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.loadOrders();
  }

  previousPage(): void {
    this.goToPage(this.page - 1);
  }

  nextPage(): void {
    this.goToPage(this.page + 1);
  }

  get pageNumbers(): (number | string)[] {
    if (this.totalPages <= 7) {
      return Array.from({ length: this.totalPages }, (_v, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (this.page > 3) {
      pages.push('…');
    }
    const start = Math.max(2, this.page - 1);
    const end = Math.min(this.totalPages - 1, this.page + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (this.page < this.totalPages - 2) {
      pages.push('…');
    }
    pages.push(this.totalPages);
    return pages;
  }

  get rangeLabel(): string {
    if (this.total === 0) {
      return '0 órdenes';
    }
    const from = (this.page - 1) * this.pageSize + 1;
    const to = Math.min(this.page * this.pageSize, this.total);
    return `${from}–${to} de ${this.total}`;
  }

  confirmOrder(order: Order): void {
    this.actionError = '';
    this.orderService.confirmOrder(order.id).subscribe({
      next: () => this.loadOrders(),
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  cancelOrder(order: Order): void {
    this.actionError = '';
    this.orderService.cancelOrder(order.id).subscribe({
      next: () => this.loadOrders(),
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  private loadOrders(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const status = this.statusFilter === 'all' ? undefined : this.statusFilter;
    const q = this.searchTerm.trim() || undefined;
    this.orderService.getOrders(this.page, this.pageSize, status, q).subscribe({
      next: (result: OrderPage) => {
        const lastPage = Math.max(1, result.totalPages);
        if (result.orders.length === 0 && result.total > 0 && this.page > lastPage) {
          this.page = lastPage;
          this.loadOrders();
          return;
        }
        this.orders = result.orders;
        this.total = result.total;
        this.totalPages = result.totalPages;
        this.loading = false;
        this.errorMessage = '';
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loading = false;
        this.errorMessage = err.message;
        this.cdr.markForCheck();
      }
    });
  }
}
