import { Component, OnInit } from '@angular/core';
import { Cart, CartItem } from '../../../core/models/cart.model';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { OrderItem } from '../../../core/models/order.model';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'app-cart-view',
  templateUrl: './cart-view.component.html',
  styleUrls: ['./cart-view.component.scss']
})
export class CartViewComponent implements OnInit {
  cart: Cart | null = null;
  loading = true;
  updating = false;
  updateMessage: { type: 'success' | 'error'; text: string } | null = null;
  breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Inicio', link: '/' },
    { label: 'Carrito', link: '' }
  ];

  constructor(
    private readonly cartService: CartService,
    private readonly orderService: OrderService
  ) {}

  get hasRegisteredOrder(): boolean {
    return !!this.cart?.orderCode;
  }

  get orderModified(): boolean {
    return !!this.cart?.orderModified;
  }

  ngOnInit(): void {
    this.cartService.getCart().subscribe(cart => {
      this.cart = cart;
      this.loading = false;
    });
  }

  removeItem(productId: string): void {
    this.cartService.removeItem(productId);
  }

  updateQuantity(productId: string, quantity: number): void {
    this.cartService.updateQuantity(productId, quantity);
  }

  clearCart(): void {
    this.cartService.clearCart();
  }

  updateOrder(): void {
    const orderCode = this.cart?.orderCode;
    if (!orderCode || !this.cart?.items.length) {
      return;
    }
    this.updating = true;
    this.updateMessage = null;
    this.orderService.updateOrderItems(orderCode, this.toOrderItems(this.cart.items)).subscribe({
      next: () => {
        this.cartService.markOrderSynced();
        this.updating = false;
        this.updateMessage = { type: 'success', text: 'Tu pedido fue actualizado.' };
      },
      error: () => {
        this.updating = false;
        this.updateMessage = { type: 'error', text: 'No se pudo actualizar. Puede que la orden ya no esté disponible.' };
      }
    });
  }

  private toOrderItems(items: CartItem[]): OrderItem[] {
    return items.map(item => ({
      productId: item.productId,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.discountPrice ?? item.product.price
    }));
  }
}
