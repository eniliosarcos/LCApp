import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../shared/shared.module';
import { HomeRoutingModule } from './home-routing.module';
import { CategoryListComponent } from './pages/category-list/category-list.component';

@NgModule({
  declarations: [CategoryListComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule]
})
export class HomeModule {}
