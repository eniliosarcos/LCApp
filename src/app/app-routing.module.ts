import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', loadChildren: () => import('./home/home.module').then(m => m.HomeModule), data: { animation: 'client' } },
  { path: 'catalog/:categoryId', loadChildren: () => import('./catalog/catalog.module').then(m => m.CatalogModule), data: { animation: 'client' } },
  { path: 'cart', loadChildren: () => import('./cart/cart.module').then(m => m.CartModule), data: { animation: 'client' } },
  { path: 'login', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule), data: { animation: 'client' } },
  {
    path: 'admin',
    canActivate: [AuthGuard],
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
