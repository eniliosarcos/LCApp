import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Order, OrderStats } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

const RECENT_PENDING_LIMIT = 5;

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  stats: OrderStats | null = null;
  recentOrders: Order[] = [];
  loading = true;
  error = false;
  actionError = '';
  pendingAction: { order: Order; type: 'confirm' | 'cancel' } | null = null;

  constructor(
    private readonly orderService: OrderService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.orderService.getStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cdr.markForCheck();
      }
    });
    this.orderService.getOrders(1, RECENT_PENDING_LIMIT, 'pending').subscribe({
      next: result => {
        this.recentOrders = result.orders;
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

  orderTrackBy(_index: number, order: Order): string {
    return order.id;
  }

  itemTrackBy(_index: number, item: { productId: string }): string {
    return item.productId;
  }

  confirmOrder(order: Order): void {
    this.actionError = '';
    this.orderService.confirmOrder(order.id).subscribe({
      next: updated => {
        order.status = updated.status;
        order.confirmedAt = updated.confirmedAt;
        this.loadRecent();
        this.refreshStats();
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  cancelOrder(order: Order): void {
    this.actionError = '';
    this.orderService.cancelOrder(order.id).subscribe({
      next: updated => {
        order.status = updated.status;
        this.loadRecent();
        this.refreshStats();
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.actionError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  requestConfirm(order: Order): void {
    this.pendingAction = { order, type: 'confirm' };
  }

  requestCancel(order: Order): void {
    this.pendingAction = { order, type: 'cancel' };
  }

  closePendingAction(): void {
    this.pendingAction = null;
  }

  runPendingAction(): void {
    if (!this.pendingAction) {
      return;
    }
    const { order, type } = this.pendingAction;
    this.pendingAction = null;
    this.cdr.markForCheck();
    if (type === 'confirm') {
      this.confirmOrder(order);
    } else {
      this.cancelOrder(order);
    }
  }

  pendingActionMessage(action: { order: Order; type: 'confirm' | 'cancel' }): string {
    return action.type === 'confirm'
      ? `¿Confirmar la venta de la orden ${action.order.code}? El stock se descontará automáticamente.`
      : `¿Cancelar la orden ${action.order.code}?`;
  }

  private loadRecent(): void {
    this.orderService.getOrders(1, RECENT_PENDING_LIMIT, 'pending').subscribe({
      next: result => {
        this.recentOrders = result.orders;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cdr.markForCheck();
      }
    });
  }

  private refreshStats(): void {
    this.orderService.getStats().subscribe({
      next: stats => {
        this.stats = stats;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cdr.markForCheck();
      }
    });
  }
}
