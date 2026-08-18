import { AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { Product } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit, AfterViewChecked {
  @ViewChild('stripScroll') stripScroll?: ElementRef<HTMLElement>;

  categories: Category[] = [];
  products: Product[] = [];
  selectedCategoryId = '';
  searchTerm = '';
  loading = true;
  error = false;
  categoriesError = false;
  canScrollLeft = false;
  canScrollRight = false;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get selectedCategoryName(): string {
    const category = this.categories.find(category => category.id === this.selectedCategoryId);
    return category ? category.name : 'Todos los productos';
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

  ngAfterViewChecked(): void {
    this.updateStripFades();
  }

  onStripScroll(): void {
    this.updateStripFades();
    this.cdr.markForCheck();
  }

  scrollStrip(direction: number): void {
    this.stripScroll?.nativeElement.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  selectCategory(categoryId: string): void {
    if (this.selectedCategoryId === categoryId) {
      return;
    }
    this.selectedCategoryId = categoryId;
    this.loadProducts(categoryId);
    this.scrollActiveChipIntoView();
  }

  categoryTrackBy(_index: number, category: Category): string {
    return category.id;
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }

  private scrollActiveChipIntoView(): void {
    const container = this.stripScroll?.nativeElement;
    if (!container) {
      return;
    }
    const chips = container.querySelectorAll<HTMLButtonElement>('.chip');
    const index = this.selectedCategoryId === ''
      ? 0
      : this.categories.findIndex(category => category.id === this.selectedCategoryId) + 1;
    const chip = chips[index];
    if (!chip) {
      return;
    }
    chip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  private updateStripFades(): void {
    const el = this.stripScroll?.nativeElement;
    if (!el) {
      return;
    }
    const canScrollLeft = el.scrollLeft > 4;
    const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    if (canScrollLeft !== this.canScrollLeft || canScrollRight !== this.canScrollRight) {
      this.canScrollLeft = canScrollLeft;
      this.canScrollRight = canScrollRight;
      this.cdr.markForCheck();
    }
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
