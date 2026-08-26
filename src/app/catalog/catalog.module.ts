import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogRoutingModule } from './catalog-routing.module';
import { SharedModule } from '../shared/shared.module';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery.component';

@NgModule({
  declarations: [ProductDetailComponent, ProductGalleryComponent],
  imports: [CommonModule, FormsModule, CatalogRoutingModule, SharedModule]
})
export class CatalogModule {}
