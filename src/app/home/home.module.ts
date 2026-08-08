import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeRoutingModule } from './home-routing.module';
import { CategoryListComponent } from './pages/category-list/category-list.component';

@NgModule({
  declarations: [CategoryListComponent],
  imports: [CommonModule, HomeRoutingModule]
})
export class HomeModule {}
