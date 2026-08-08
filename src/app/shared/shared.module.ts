import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { CurrencyFormatPipe } from './pipes/currency-format.pipe';

@NgModule({
  declarations: [HeaderComponent, BreadcrumbsComponent, CurrencyFormatPipe],
  imports: [CommonModule, RouterModule],
  exports: [HeaderComponent, BreadcrumbsComponent, CurrencyFormatPipe]
})
export class SharedModule {}
