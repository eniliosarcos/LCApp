import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  categories: Category[] = [];
  products: Product[] = [];
  selectedCategoryId = '';
  loading = true;
  error = false;
  categoriesError = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get selectedCategoryName(): string {
    const category = this.categories.find(category => category.id === this.selectedCategoryId);
    return category ? category.name : 'Todos los productos';
  }

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        this.cdr.markForCheck();
      },
      error: () => {
        this.categoriesError = true;
        this.cdr.markForCheck();
      }
    });
    this.loadProducts('');
  }

  selectCategory(categoryId: string): void {
    if (this.selectedCategoryId === categoryId) {
      return;
    }
    this.selectedCategoryId = categoryId;
    this.loadProducts(categoryId);
  }

  categoryTrackBy(_index: number, category: Category): string {
    return category.id;
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }

  private loadProducts(categoryId: string): void {
    this.loading = true;
    this.error = false;
    this.cdr.markForCheck();
    const request = categoryId
      ? this.catalogService.getProductsByCategory(categoryId)
      : this.catalogService.getProducts();
    request.subscribe({
      next: products => {
        this.products = products;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        this.cdr.markForCheck();
      }
    });
  }
}
