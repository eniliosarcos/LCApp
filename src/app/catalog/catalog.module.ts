import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogRoutingModule } from './catalog-routing.module';
import { SharedModule } from '../shared/shared.module';
import { ProductListComponent } from './pages/product-list/product-list.component';
import { ProductDetailComponent } from './pages/product-detail/product-detail.component';
import { ProductGalleryComponent } from './components/product-gallery/product-gallery.component';

@NgModule({
  declarations: [ProductListComponent, ProductDetailComponent, ProductGalleryComponent],
  imports: [CommonModule, FormsModule, CatalogRoutingModule, SharedModule]
})
export class CatalogModule {}
