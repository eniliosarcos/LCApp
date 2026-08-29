import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Order, PaymentStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-credit-detail',
  templateUrl: './credit-detail.component.html',
  styleUrls: ['./credit-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreditDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  errorMessage = '';
  actionError = '';
  paymentAmount: number | null = null;
  paymentNote = '';
  submitting = false;

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

  get remaining(): number {
    if (!this.order) return 0;
    return Math.round((this.order.total - this.order.amountPaid) * 100) / 100;
  }

  get maxPayment(): number {
    return this.remaining;
  }

  get canPay(): boolean {
    return !!this.order && this.order.paymentStatus !== 'paid';
  }

  itemSubtotal(item: { price: number; quantity: number }): number {
    return item.price * item.quantity;
  }

  itemTrackBy(_index: number, item: { productId: string }): string {
    return item.productId;
  }

  paymentTrackBy(_index: number, payment: { date: string }): string {
    return payment.date;
  }

  paymentStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case 'unpaid': return 'Sin pagar';
      case 'partial': return 'Parcial';
      case 'paid': return 'Pagado';
      default: return status;
    }
  }

  submitPayment(): void {
    if (!this.order || !this.paymentAmount || this.paymentAmount <= 0) {
      return;
    }
    this.submitting = true;
    this.actionError = '';
    this.orderService.addPayment(this.order.id, {
      amount: this.paymentAmount,
      note: this.paymentNote.trim() || undefined
    }).subscribe({
      next: (updated) => {
        this.order = updated;
        this.paymentAmount = null;
        this.paymentNote = '';
        this.submitting = false;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.actionError = err.message;
        this.submitting = false;
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
        this.errorMessage = status === 404 ? 'Fiado no encontrado.' : err.message;
        this.cdr.markForCheck();
      }
    });
  }
}
