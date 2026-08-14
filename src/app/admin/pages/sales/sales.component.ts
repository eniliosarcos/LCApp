import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CategorySummary, OrderSummary, SummaryRange, TopProduct } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

interface RangeOption {
  value: SummaryRange;
  label: string;
}

const RANGE_OPTIONS: RangeOption[] = [
  { value: 'day', label: 'Diario' },
  { value: 'week', label: 'Semanal' },
  { value: 'month', label: 'Mensual' },
];

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesComponent implements OnInit {
  readonly rangeOptions = RANGE_OPTIONS;
  range: SummaryRange = 'week';
  summary: OrderSummary | null = null;
  productSort: 'units' | 'revenue' = 'units';
  loading = true;
  error = false;

  constructor(
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  get avgTicket(): number {
    return this.summary && this.summary.sales > 0 ? this.summary.revenue / this.summary.sales : 0;
  }

  get cancellationRate(): number {
    return this.summary && this.summary.totalOrders > 0 ? this.summary.cancelled / this.summary.totalOrders : 0;
  }

  get sortedTopProducts(): TopProduct[] {
    const products = this.summary?.topProducts ?? [];
    return [...products].sort((a, b) => b[this.productSort] - a[this.productSort]);
  }

  topProductTrackBy(_index: number, product: TopProduct): string {
    return product.productId;
  }

  categoryTrackBy(_index: number, category: CategorySummary): string {
    return category.categoryName;
  }

  selectRange(range: SummaryRange): void {
    if (this.range === range) {
      return;
    }
    this.range = range;
    this.load();
  }

  toggleProductSort(sort: 'units' | 'revenue'): void {
    this.productSort = sort;
    this.cdr.markForCheck();
  }

  private load(): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    this.orderService.getSummary(this.range).subscribe({
      next: summary => {
        this.summary = summary;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
