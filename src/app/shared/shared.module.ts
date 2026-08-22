import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { CategoryStripComponent } from './components/category-strip/category-strip.component';
import { AppModalComponent } from './components/modal/app-modal.component';
import { AppConfirmDialogComponent } from './components/confirm-dialog/app-confirm-dialog.component';
import { AppSnackbarComponent } from './components/snackbar/app-snackbar.component';
import { AppLoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { ProductImageCarouselComponent } from './components/product-image-carousel/product-image-carousel.component';
import { ScrollRevealDirective } from './directives/scroll-reveal.directive';

@NgModule({
  declarations: [HeaderComponent, BreadcrumbsComponent, CategoryStripComponent, AppModalComponent, AppConfirmDialogComponent, AppSnackbarComponent, AppLoadingSpinnerComponent, ProductCardComponent, ProductImageCarouselComponent, ScrollRevealDirective],
  imports: [CommonModule, RouterModule],
  exports: [HeaderComponent, BreadcrumbsComponent, CategoryStripComponent, AppModalComponent, AppConfirmDialogComponent, AppSnackbarComponent, AppLoadingSpinnerComponent, ProductCardComponent, ProductImageCarouselComponent, ScrollRevealDirective]
})
export class SharedModule {}
