import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminRoutingModule } from './admin-routing.module';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ContactSettingsComponent } from './pages/contact-settings/contact-settings.component';

@NgModule({
  declarations: [DashboardComponent, ContactSettingsComponent],
  imports: [CommonModule, FormsModule, AdminRoutingModule]
})
export class AdminModule {}
