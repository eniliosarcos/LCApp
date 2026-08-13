import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { AppModalComponent } from './components/modal/app-modal.component';
import { CurrencyFormatPipe } from './pipes/currency-format.pipe';

@NgModule({
  declarations: [HeaderComponent, BreadcrumbsComponent, AppModalComponent, CurrencyFormatPipe],
  imports: [CommonModule, RouterModule],
  exports: [HeaderComponent, BreadcrumbsComponent, AppModalComponent, CurrencyFormatPipe]
})
export class SharedModule {}
