import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  products: Product[] = [];
  searchTerm = '';
  loading = true;
  error = false;
  categoriesError = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get selectedCategoryName(): string {
    return 'Todos los productos';
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

  ngOnInit(): void {
    this.catalogService.getProducts().subscribe({
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

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }
}
