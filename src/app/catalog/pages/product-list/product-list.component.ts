import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { BreadcrumbItem } from '../../../core/models/breadcrumb.model';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {
  category?: Category;
  products: Product[] = [];
  searchTerm = '';
  loading = true;
  error = false;

  get breadcrumbItems(): BreadcrumbItem[] {
    return [
      { label: 'Inicio', link: '/' },
      { label: this.category?.name || 'Productos' }
    ];
  }

  get filteredProducts(): Product[] {
    let result = this.products;
    if (this.searchTerm.trim()) {
      const term = this.normalizeText(this.searchTerm);
      result = result.filter(p => this.normalizeText(p.name).includes(term));
    }
    return result;
  }

  private normalizeText(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const categoryId = params.get('categoryId');
        this.loading = true;
        this.error = false;
        if (!categoryId) {
          return of({ category: undefined as Category | undefined, products: [] as Product[] });
        }
        return forkJoin({
          category: this.catalogService.getCategoryById(categoryId),
          products: this.catalogService.getProductsByCategory(categoryId)
        });
      })
    ).subscribe({
      next: ({ category, products }) => {
        this.category = category;
        this.products = products;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }
}
