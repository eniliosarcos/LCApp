import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartRoutingModule } from './cart-routing.module';
import { SharedModule } from '../shared/shared.module';
import { CartViewComponent } from './pages/cart-view/cart-view.component';
import { CartItemComponent } from './components/cart-item/cart-item.component';
import { CartSummaryComponent } from './components/cart-summary/cart-summary.component';

@NgModule({
  declarations: [CartViewComponent, CartItemComponent, CartSummaryComponent],
  imports: [CommonModule, CartRoutingModule, SharedModule]
})
export class CartModule {}
