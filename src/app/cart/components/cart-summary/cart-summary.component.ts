import { Component, Input, OnInit } from '@angular/core';
import { Cart } from '../../../core/models/cart.model';
import { ContactConfig } from '../../../core/models/environment.model';
import { ContactService } from '../../../core/services/contact.service';

@Component({
  selector: 'app-cart-summary',
  templateUrl: './cart-summary.component.html',
  styleUrls: ['./cart-summary.component.scss']
})
export class CartSummaryComponent implements OnInit {
  @Input() cart!: Cart;

  contact: ContactConfig | null = null;

  constructor(private readonly contactService: ContactService) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.contact = config;
    });
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

  getWhatsAppHref(): string {
    if (!this.contact?.whatsapp) {
      return '#';
    }
    return `https://wa.me/${this.contact.whatsapp}?text=Hola! Mi código de carrito es: ${this.cart.code}`;
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
}
