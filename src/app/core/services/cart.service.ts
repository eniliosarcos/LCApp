import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cart, CartItem } from '../models/cart.model';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly storageKey = 'catalog_cart';
  private readonly cart$ = new BehaviorSubject<Cart>(this.load());

  getCart(): Observable<Cart> {
    return this.cart$.asObservable();
  }

  getItems(): Observable<CartItem[]> {
    return this.cart$.asObservable().pipe(map(cart => cart.items));
  }

  getCount(): Observable<number> {
    return this.cart$.asObservable().pipe(
      map(cart => cart.items.reduce((sum, item) => sum + item.quantity, 0))
    );
  }

  getTotal(): Observable<number> {
    return this.cart$.asObservable().pipe(
      map(cart => cart.items.reduce((sum, item) => sum + this.itemPrice(item) * item.quantity, 0))
    );
  }

  addItem(product: Product, quantity = 1): void {
    const cart = this.cart$.getValue();
    const existing = cart.items.find(item => item.productId === product.id);
    if (existing) {
      this.updateQuantity(product.id, existing.quantity + quantity);
      return;
    }
    cart.items.push({ productId: product.id, product, quantity });
    this.emit(cart);
  }

  updateQuantity(productId: string, quantity: number): void {
    const cart = this.cart$.getValue();
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }
    const item = cart.items.find(i => i.productId === productId);
    if (item) {
      item.quantity = quantity;
      this.emit(cart);
    }
  }

  removeItem(productId: string): void {
    const cart = this.cart$.getValue();
    cart.items = cart.items.filter(item => item.productId !== productId);
    this.emit(cart);
  }

  clearCart(): void {
    this.emit(this.createEmptyCart());
  }

  getCartCode(): string {
    return this.cart$.getValue().code;
  }

  private itemPrice(item: CartItem): number {
    return item.product.discountPrice ?? item.product.price;
  }

  private emit(cart: Cart): void {
    this.persist(cart);
    this.cart$.next({ ...cart, items: [...cart.items] });
  }

  private createEmptyCart(): Cart {
    return {
      id: this.generateId(),
      items: [],
      code: this.generateCode(),
      createdAt: new Date().toISOString()
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'CAR-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private load(): Cart {
    const raw = localStorage.getItem(this.storageKey);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback to empty cart
      }
    }
    return this.createEmptyCart();
  }

  private persist(cart: Cart): void {
    localStorage.setItem(this.storageKey, JSON.stringify(cart));
  }
}
