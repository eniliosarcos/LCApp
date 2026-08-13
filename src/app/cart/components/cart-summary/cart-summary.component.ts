import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Cart } from '../../../core/models/cart.model';
import { ContactConfig } from '../../../core/models/contact.model';
import { CreateOrderRequest, OrderStatus } from '../../../core/models/order.model';
import { CartService } from '../../../core/services/cart.service';
import { ContactService } from '../../../core/services/contact.service';
import { OrderService } from '../../../core/services/order.service';

type ContactChannel = 'whatsapp' | 'instagram' | 'telegram';

const REDIRECT_DELAY_MS = 2000;
const SUCCESS_REDIRECT_MS = 4000;

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent implements OnInit, OnDestroy {
  @Input() cart!: Cart;

  contact: ContactConfig | null = null;
  contacting = false;
  redirecting = false;
  registered = false;
  checkingOrder = false;
  orderConfirmed = false;
  orderNotice = '';
  errorMessage = '';

  private readonly destroy$ = new Subject<void>();
  private contactChannel: ContactChannel = 'whatsapp';

  constructor(
    private readonly router: Router,
    private readonly contactService: ContactService,
    private readonly orderService: OrderService,
    private readonly cartService: CartService
  ) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.contact = config;
    });
    this.registered = this.cartService.hasRegisteredOrder();
    if (this.registered) {
      this.verifyOrder();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getTotalItems(): number {
    return this.cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  getSubtotal(): number {
    return this.cart.items.reduce((total, item) => {
      const price = item.product.discountPrice ?? item.product.price;
      return total + price * item.quantity;
    }, 0);
  }

  getOrderCode(): string {
    return this.cart.orderCode ?? this.cart.code;
  }

  get channelName(): string {
    switch (this.contactChannel) {
      case 'whatsapp':
        return 'WhatsApp';
      case 'instagram':
        return 'Instagram';
      case 'telegram':
        return 'Telegram';
    }
  }

  openContact(channel: ContactChannel): void {
    if (this.contacting || this.redirecting) {
      return;
    }

    this.contactChannel = channel;
    this.errorMessage = '';
    this.redirecting = true;

    if (this.cartService.hasRegisteredOrder()) {
      this.delayAndOpen();
      return;
    }

    this.contacting = true;
    this.orderService.createOrder(this.buildRequest()).subscribe({
      next: order => {
        this.cartService.registerOrder(order.code);
        this.registered = true;
        this.contacting = false;
        this.delayAndOpen();
      },
      error: () => {
        this.contacting = false;
        this.redirecting = false;
        this.errorMessage = 'No se pudo registrar tu pedido. Verifica tu conexión e inténtalo de nuevo.';
      }
    });
  }

  goHome(): void {
    this.cartService.clearCart();
    this.router.navigate(['/']);
  }

  getWhatsAppHref(): string {
    if (!this.contact?.whatsapp) {
      return '#';
    }
    return `https://wa.me/${this.contact.whatsapp}?text=Hola! Mi código de pedido es: ${this.getOrderCode()}`;
  }

  getInstagramHref(): string {
    if (!this.contact?.instagram) {
      return '#';
    }
    return `https://instagram.com/${this.contact.instagram.replace('@', '')}`;
  }

  getTelegramHref(): string {
    if (!this.contact?.telegram) {
      return '#';
    }
    return `https://t.me/${this.contact.telegram.replace('@', '')}`;
  }

  private verifyOrder(): void {
    const code = this.cart.orderCode;
    if (!code) {
      return;
    }

    this.checkingOrder = true;
    this.orderService.getOrderStatus(code).subscribe({
      next: status => {
        this.checkingOrder = false;
        this.applyOrderStatus(status.status);
      },
      error: err => {
        this.checkingOrder = false;
        if (err?.status === 404) {
          this.resetRegistration('Ya no encontramos tu pedido registrado.');
        }
      }
    });
  }

  private applyOrderStatus(status: OrderStatus): void {
    switch (status) {
      case 'confirmed':
        this.orderConfirmed = true;
        timer(SUCCESS_REDIRECT_MS)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => this.goHome());
        break;
      case 'cancelled':
        this.resetRegistration('Tu pedido fue cancelado. Si deseas, vuelve a contactarnos.');
        break;
      default:
        break;
    }
  }

  private resetRegistration(notice: string): void {
    this.cartService.clearOrderCode();
    this.registered = false;
    this.orderNotice = notice;
  }

  private buildRequest(): CreateOrderRequest {
    return {
      items: this.cart.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.discountPrice ?? item.product.price
      }))
    };
  }

  private delayAndOpen(): void {
    timer(REDIRECT_DELAY_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.openChannel();
        this.redirecting = false;
      });
  }

  private openChannel(): void {
    const href = this.getChannelHref(this.contactChannel);
    if (href && href !== '#') {
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  }

  private getChannelHref(channel: ContactChannel): string {
    switch (channel) {
      case 'whatsapp':
        return this.getWhatsAppHref();
      case 'instagram':
        return this.getInstagramHref();
      case 'telegram':
        return this.getTelegramHref();
    }
  }
}
