import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsComponent implements OnInit {
  categories: Category[] = [];
  products: Product[] = [];
  loading = true;
  error = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.catalogService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.cdr.markForCheck();
      }
    });
    this.catalogService.getProducts().subscribe({
      next: products => {
        this.products = products;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  categoryName(categoryId: string): string {
    return this.categories.find(category => category.id === categoryId)?.name ?? '-';
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }
}
