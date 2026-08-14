import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ContactSettingsComponent } from './pages/contact-settings/contact-settings.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { ProductsComponent } from './pages/products/products.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [
      { path: '', component: DashboardComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'contact', component: ContactSettingsComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
