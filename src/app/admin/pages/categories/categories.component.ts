import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { CatalogService, CategoryPayload } from '../../../core/services/catalog.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

interface CategoryForm {
  name: string;
  description: string;
  imageUrl: string;
}

const EMPTY_FORM: CategoryForm = { name: '', description: '', imageUrl: '' };

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  loading = true;
  error = false;

  formOpen = false;
  formSaving = false;
  formError = '';
  editingCategory: Category | null = null;
  form: CategoryForm = { ...EMPTY_FORM };

  constructor(
    private readonly catalogService: CatalogService,
    private readonly snackbar: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get formTitle(): string {
    return this.editingCategory ? 'Editar categoría' : 'Nueva categoría';
  }

  ngOnInit(): void {
    this.reload();
  }

  categoryTrackBy(_index: number, category: Category): string {
    return category.id;
  }

  openCreate(): void {
    this.editingCategory = null;
    this.form = { ...EMPTY_FORM };
    this.formError = '';
    this.formOpen = true;
    this.cdr.markForCheck();
  }

  openEdit(category: Category): void {
    this.editingCategory = category;
    this.form = {
      name: category.name,
      description: category.description ?? '',
      imageUrl: category.imageUrl ?? ''
    };
    this.formError = '';
    this.formOpen = true;
    this.cdr.markForCheck();
  }

  closeForm(): void {
    if (this.formSaving) {
      return;
    }
    this.formOpen = false;
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    if (!this.form.name.trim()) {
      this.formError = 'El nombre es obligatorio.';
      this.cdr.markForCheck();
      return;
    }

    this.formSaving = true;
    this.formError = '';

    const payload: CategoryPayload = {
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      imageUrl: this.form.imageUrl.trim()
    };

    const request = this.editingCategory
      ? this.catalogService.updateCategory(this.editingCategory.id, payload)
      : this.catalogService.createCategory(payload);
    const message = this.editingCategory ? 'Categoría actualizada' : 'Categoría creada';

    request.subscribe({
      next: () => {
        this.formSaving = false;
        this.formOpen = false;
        this.snackbar.show(message, 'success');
        this.reload();
      },
      error: (err: Error) => {
        this.formSaving = false;
        this.formError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  private reload(): void {
    this.loading = true;
    this.error = false;
    this.catalogService.getCategories().subscribe({
      next: categories => {
        this.categories = categories;
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
