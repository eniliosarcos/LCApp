import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CartItem, CartItemQuantity } from '../../../core/models/cart.model';

@Component({
  selector: 'app-cart-item',
  templateUrl: './cart-item.component.html',
  styleUrls: ['./cart-item.component.scss']
})
export class CartItemComponent {
  @Input() item!: CartItem;
  @Output() remove = new EventEmitter<string>();
  @Output() updateQuantity = new EventEmitter<CartItemQuantity>();

  get unitPrice(): number {
    return this.item.product.discountPrice ?? this.item.product.price;
  }

  get hasDiscount(): boolean {
    return !!this.item.product.discountPrice;
  }

  get fallback(): string {
    return this.item.product.name.charAt(0);
  }

  increaseQuantity(): void {
    this.updateQuantity.emit({ productId: this.item.productId, quantity: this.item.quantity + 1 });
  }

  decreaseQuantity(): void {
    if (this.item.quantity > 1) {
      this.updateQuantity.emit({ productId: this.item.productId, quantity: this.item.quantity - 1 });
    }
  }

  onRemove(): void {
    this.remove.emit(this.item.productId);
  }
}
