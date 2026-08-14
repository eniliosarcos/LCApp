import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Order } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  errorMessage = '';
  actionError = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      this.loadOrder(code);
    }
  }

  get orderCode(): string {
    return this.order?.code ?? '';
  }

  itemSubtotal(item: { price: number; quantity: number }): number {
    return item.price * item.quantity;
  }

  itemTrackBy(_index: number, item: { productId: string }): string {
    return item.productId;
  }

  confirmOrder(): void {
    if (!this.order) {
      return;
    }
    this.actionError = '';
    this.orderService.confirmOrder(this.order.id).subscribe({
      next: updated => {
        this.order = updated;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  cancelOrder(): void {
    if (!this.order) {
      return;
    }
    this.actionError = '';
    this.orderService.cancelOrder(this.order.id).subscribe({
      next: updated => {
        this.order = updated;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  private loadOrder(code: string): void {
    this.loading = true;
    this.orderService.getOrderByCode(code).subscribe({
      next: order => {
        this.order = order;
        this.loading = false;
        this.errorMessage = '';
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.loading = false;
        const status = (err as Error & { status?: number }).status;
        this.errorMessage = status === 404 ? 'Orden no encontrada.' : err.message;
        this.cdr.markForCheck();
      }
    });
  }
}
