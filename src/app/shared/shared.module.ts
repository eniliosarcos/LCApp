import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';
import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';
import { AppModalComponent } from './components/modal/app-modal.component';
import { AppConfirmDialogComponent } from './components/confirm-dialog/app-confirm-dialog.component';
import { AppSnackbarComponent } from './components/snackbar/app-snackbar.component';
import { AppLoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { CurrencyFormatPipe } from './pipes/currency-format.pipe';

@NgModule({
  declarations: [HeaderComponent, BreadcrumbsComponent, AppModalComponent, AppConfirmDialogComponent, AppSnackbarComponent, AppLoadingSpinnerComponent, CurrencyFormatPipe],
  imports: [CommonModule, RouterModule],
  exports: [HeaderComponent, BreadcrumbsComponent, AppModalComponent, AppConfirmDialogComponent, AppSnackbarComponent, AppLoadingSpinnerComponent, CurrencyFormatPipe]
})
export class SharedModule {}
