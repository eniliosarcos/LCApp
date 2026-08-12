import { Component, Input, OnInit } from '@angular/core';
import { Cart } from '../../../core/models/cart.model';
import { ContactConfig } from '../../../core/models/environment.model';
import { CreateOrderRequest } from '../../../core/models/order.model';
import { CartService } from '../../../core/services/cart.service';
import { ContactService } from '../../../core/services/contact.service';
import { OrderService } from '../../../core/services/order.service';

type ContactChannel = 'whatsapp' | 'instagram' | 'telegram';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent implements OnInit {
  @Input() cart!: Cart;

  contact: ContactConfig | null = null;
  contacting = false;
  registered = false;
  errorMessage = '';

  private contactChannel: ContactChannel = 'whatsapp';

  constructor(
    private readonly contactService: ContactService,
    private readonly orderService: OrderService,
    private readonly cartService: CartService
  ) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.contact = config;
    });
    this.registered = this.cartService.hasRegisteredOrder();
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

  openContact(channel: ContactChannel): void {
    if (this.contacting) {
      return;
    }

    this.contactChannel = channel;
    this.errorMessage = '';

    if (this.cartService.hasRegisteredOrder()) {
      this.openChannel();
      return;
    }

    this.contacting = true;
    this.orderService.createOrder(this.buildRequest()).subscribe({
      next: order => {
        this.cartService.registerOrder(order.code);
        this.registered = true;
        this.contacting = false;
        this.openChannel();
      },
      error: () => {
        this.contacting = false;
        this.errorMessage = 'No se pudo registrar tu pedido. Verifica tu conexión e inténtalo de nuevo.';
      }
    });
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

  private openChannel(): void {
    const href = this.getChannelHref(this.contactChannel);
    if (href && href !== '#') {
      window.open(href, '_blank', 'noopener');
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
