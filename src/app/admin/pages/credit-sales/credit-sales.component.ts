import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Order, CreditSalePage, PaymentStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-credit-sales',
  templateUrl: './credit-sales.component.html',
  styleUrls: ['./credit-sales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditSalesComponent implements OnInit {
  orders: Order[] = [];
  statusFilter: 'all' | PaymentStatus = 'all';
  searchTerm = '';
  page = 1;
  total = 0;
  totalPages = 0;
  totalPending = 0;
  loading = true;
  errorMessage = '';
  readonly pageSize = PAGE_SIZE;

  constructor(
    private readonly orderService: OrderService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCreditSales();
  }

  orderTrackBy(_index: number, order: Order): string {
    return order.id;
  }

  goToDetail(order: Order): void {
    this.router.navigate(['/admin/credit/detail', order.code]);
  }

  onFilterChange(status: 'all' | PaymentStatus): void {
    this.statusFilter = status;
    this.page = 1;
    this.loadCreditSales();
  }

  onSearchInput(value: string): void {
    this.searchTerm = value;
    this.page = 1;
    this.loadCreditSales();
  }

  goToPage(page: number | string): void {
    if (typeof page !== 'number' || page < 1 || page > this.totalPages || page === this.page) {
      return;
    }
    this.page = page;
    this.loadCreditSales();
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
      pages.push('...');
    }
    const start = Math.max(2, this.page - 1);
    const end = Math.min(this.totalPages - 1, this.page + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (this.page < this.totalPages - 2) {
      pages.push('...');
    }
    pages.push(this.totalPages);
    return pages;
  }

  get rangeLabel(): string {
    if (this.total === 0) {
      return '0 fiados';
    }
    const from = (this.page - 1) * this.pageSize + 1;
    const to = Math.min(this.page * this.pageSize, this.total);
    return `${from}\u2013${to} de ${this.total}`;
  }

  remaining(order: Order): number {
    return Math.round((order.total - order.amountPaid) * 100) / 100;
  }

  paymentStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case 'unpaid': return 'Sin pagar';
      case 'partial': return 'Parcial';
      case 'paid': return 'Pagado';
      default: return status;
    }
  }

  private loadCreditSales(): void {
    this.loading = true;
    this.cdr.markForCheck();
    const status = this.statusFilter === 'all' ? undefined : this.statusFilter;
    const q = this.searchTerm.trim() || undefined;
    this.orderService.getCreditSales(this.page, this.pageSize, status, q).subscribe({
      next: (result: CreditSalePage) => {
        const lastPage = Math.max(1, result.totalPages);
        if (result.orders.length === 0 && result.total > 0 && this.page > lastPage) {
          this.page = lastPage;
          this.loadCreditSales();
          return;
        }
        this.orders = result.orders;
        this.total = result.total;
        this.totalPages = result.totalPages;
        this.totalPending = result.totalPending;
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
