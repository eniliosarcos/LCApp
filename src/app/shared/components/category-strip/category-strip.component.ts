import { AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { Category } from '../../../core/models/category.model';
import { CatalogService } from '../../../core/services/catalog.service';

@Component({
  selector: 'app-category-strip',
  templateUrl: './category-strip.component.html',
  styleUrls: ['./category-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryStripComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('stripScroll') stripScroll?: ElementRef<HTMLElement>;

  categories: Category[] = [];
  selectedCategoryId = '';
  canScrollLeft = false;
  canScrollRight = false;

  private readonly destroy$ = new Subject<void>();
  private pendingScroll = false;
  private scrollRetries = 0;
  private static readonly MAX_SCROLL_RETRIES = 6;

  constructor(
    private readonly catalogService: CatalogService,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.updateSelectedFromRoute();
    this.catalogService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
        this.cdr.markForCheck();
      }
    });
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.updateSelectedFromRoute());
  }

  ngAfterViewChecked(): void {
    this.updateStripFades();
    if (this.pendingScroll) {
      const scrolled = this.scrollActiveChipIntoView();
      if (scrolled) {
        this.pendingScroll = false;
        this.scrollRetries = 0;
      } else if (++this.scrollRetries > CategoryStripComponent.MAX_SCROLL_RETRIES) {
        this.pendingScroll = false;
        this.scrollRetries = 0;
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onStripScroll(): void {
    this.updateStripFades();
    this.cdr.markForCheck();
  }

  scrollStrip(direction: number): void {
    this.stripScroll?.nativeElement.scrollBy({ left: direction * 320, behavior: 'smooth' });
  }

  selectCategory(categoryId: string): void {
    this.scrollToPageTop();
    if (this.selectedCategoryId === categoryId) {
      return;
    }
    this.selectedCategoryId = categoryId;
    this.scrollToActive();
    this.router.navigate(categoryId ? ['/catalog', categoryId] : ['/']);
  }

  private scrollToPageTop(): void {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  categoryTrackBy(_index: number, category: Category): string {
    return category.id;
  }

  private updateSelectedFromRoute(): void {
    const match = this.router.url.match(/\/catalog\/([^/]+)/);
    const nextId = match ? match[1] : '';
    if (nextId !== this.selectedCategoryId) {
      this.selectedCategoryId = nextId;
      this.pendingScroll = true;
      this.scrollRetries = 0;
    }
    this.cdr.markForCheck();
  }

  private scrollToActive(): void {
    if (this.scrollActiveChipIntoView()) {
      return;
    }
    this.pendingScroll = true;
    this.scrollRetries = 0;
  }

  private scrollActiveChipIntoView(): boolean {
    const container = this.stripScroll?.nativeElement;
    if (!container || !this.categories.length) {
      return false;
    }
    const chips = container.querySelectorAll<HTMLButtonElement>('.chip');
    const index = this.selectedCategoryId === ''
      ? 0
      : this.categories.findIndex(category => category.id === this.selectedCategoryId) + 1;
    const chip = chips[index];
    if (!chip) {
      return false;
    }
    const chipCenter = chip.offsetLeft + chip.offsetWidth / 2;
    const containerCenter = container.clientWidth / 2;
    container.scrollTo({ left: chipCenter - containerCenter, behavior: 'smooth' });
    return true;
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
}
