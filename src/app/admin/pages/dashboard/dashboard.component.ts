import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  categories: Category[] = [];
  products: Product[] = [];
  error = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe({
      next: categories => (this.categories = categories),
      error: () => (this.error = true)
    });
    this.catalogService.getProducts().subscribe({
      next: products => (this.products = products),
      error: () => (this.error = true)
    });
  }

  categoryName(categoryId: string): string {
    return this.categories.find(category => category.id === categoryId)?.name ?? '-';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
