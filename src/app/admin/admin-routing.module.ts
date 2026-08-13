import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ContactSettingsComponent } from './pages/contact-settings/contact-settings.component';

const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'contact', component: ContactSettingsComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
