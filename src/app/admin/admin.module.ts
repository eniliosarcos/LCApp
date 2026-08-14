import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { AdminRoutingModule } from './admin-routing.module';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ContactSettingsComponent } from './pages/contact-settings/contact-settings.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { ProductsComponent } from './pages/products/products.component';
import { OrderDetailComponent } from './pages/order-detail/order-detail.component';

@NgModule({
  declarations: [AdminLayoutComponent, DashboardComponent, ContactSettingsComponent, OrdersComponent, ProductsComponent, OrderDetailComponent],
  imports: [CommonModule, FormsModule, SharedModule, AdminRoutingModule]
})
export class AdminModule {}
