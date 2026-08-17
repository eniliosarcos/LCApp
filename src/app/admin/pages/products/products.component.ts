import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { LOW_STOCK_THRESHOLD, Product, ProductImageVariant, ProductPayload } from '../../../core/models/product.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { ImageService } from '../../../core/services/image.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

type StockFilter = 'all' | 'out' | 'low';

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

interface ProductForm {
  name: string;
  categoryId: string;
  price: number | null;
  discountPrice: number | null;
  stock: number | null;
  sku: string;
  description: string;
  tags: string;
  imageUrl: string;
  imageVariants: ProductImageVariant[];
  isActive: boolean;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  categoryId: '',
  price: null,
  discountPrice: null,
  stock: null,
  sku: '',
  description: '',
  tags: '',
  imageUrl: '',
  imageVariants: [],
  isActive: true
};

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
  stockFilter: StockFilter = 'all';

  formOpen = false;
  formSaving = false;
  formError = '';
  uploadingImage = false;
  editingProduct: Product | null = null;
  form: ProductForm = { ...EMPTY_FORM };

  constructor(
    private readonly catalogService: CatalogService,
    private readonly imageService: ImageService,
    private readonly snackbar: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get formTitle(): string {
    return this.editingProduct ? 'Editar producto' : 'Nuevo producto';
  }

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
    this.catalogService.getAllProducts().subscribe({
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

  stockStatus(product: Product): 'out' | 'low' | null {
    if (!product.isActive) {
      return null;
    }
    if (product.stock === 0) {
      return 'out';
    }
    if (product.stock <= LOW_STOCK_THRESHOLD) {
      return 'low';
    }
    return null;
  }

  get outOfStockCount(): number {
    return this.products.filter(product => this.stockStatus(product) === 'out').length;
  }

  get lowStockCount(): number {
    return this.products.filter(product => this.stockStatus(product) === 'low').length;
  }

  get visibleProducts(): Product[] {
    if (this.stockFilter === 'all') {
      return this.products;
    }
    return this.products.filter(product => this.stockStatus(product) === this.stockFilter);
  }

  toggleStockFilter(filter: Exclude<StockFilter, 'all'>): void {
    this.stockFilter = this.stockFilter === filter ? 'all' : filter;
    this.cdr.markForCheck();
  }

  resetStockFilter(): void {
    this.stockFilter = 'all';
    this.cdr.markForCheck();
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }

  openCreate(): void {
    this.editingProduct = null;
    this.form = { ...EMPTY_FORM };
    this.formError = '';
    this.formOpen = true;
    this.cdr.markForCheck();
  }

  openEdit(product: Product): void {
    const primaryImage = product.images.find(img => img.isPrimary) ?? product.images[0];
    this.editingProduct = product;
    this.form = {
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      discountPrice: product.discountPrice ?? null,
      stock: product.stock,
      sku: product.sku,
      description: product.description ?? '',
      tags: product.tags.join(', '),
      imageUrl: primaryImage?.url ?? '',
      imageVariants: primaryImage?.variants ? [...primaryImage.variants] : [],
      isActive: product.isActive
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

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      this.formError = 'Solo se permiten imágenes (JPEG, PNG, WebP, AVIF o GIF).';
      this.cdr.markForCheck();
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.formError = 'La imagen no puede superar los 5 MB.';
      this.cdr.markForCheck();
      return;
    }

    this.uploadingImage = true;
    this.formError = '';
    this.cdr.markForCheck();

    this.imageService.uploadImage(file).subscribe({
      next: result => {
        this.form.imageUrl = result.primaryUrl;
        this.form.imageVariants = result.variants;
        this.uploadingImage = false;
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.uploadingImage = false;
        this.formError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  toggleActive(product: Product): void {
    this.catalogService.updateProduct(product.id, { isActive: !product.isActive }).subscribe({
      next: updated => {
        const index = this.products.findIndex(item => item.id === updated.id);
        if (index >= 0) {
          this.products[index] = updated;
        }
        this.snackbar.show(updated.isActive ? 'Producto activado' : 'Producto desactivado', 'success');
        this.cdr.markForCheck();
      },
      error: (err: Error) => {
        this.snackbar.show(err.message, 'error');
      }
    });
  }

  onSubmit(): void {
    if (!this.form.name.trim() || !this.form.categoryId || !this.form.price || this.form.price <= 0) {
      this.formError = 'Completa nombre, categoría y un precio mayor a 0.';
      this.cdr.markForCheck();
      return;
    }

    this.formSaving = true;
    this.formError = '';

    const payload: ProductPayload = {
      name: this.form.name.trim(),
      categoryId: this.form.categoryId,
      price: Number(this.form.price),
      stock: Number(this.form.stock) || 0,
      description: this.form.description.trim(),
      tags: this.form.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag !== ''),
      images: this.form.imageUrl.trim()
        ? [{
            url: this.form.imageUrl.trim(),
            alt: this.form.name.trim(),
            isPrimary: true,
            order: 0,
            ...(this.form.imageVariants.length > 0 ? { variants: this.form.imageVariants } : {})
          }]
        : [],
      isActive: this.form.isActive
    };
    if (this.form.discountPrice && Number(this.form.discountPrice) > 0) {
      payload.discountPrice = Number(this.form.discountPrice);
    }
    if (this.form.sku.trim()) {
      payload.sku = this.form.sku.trim();
    }

    const request = this.editingProduct
      ? this.catalogService.updateProduct(this.editingProduct.id, payload)
      : this.catalogService.createProduct(payload);
    const message = this.editingProduct ? 'Producto actualizado' : 'Producto creado';

    request.subscribe({
      next: () => {
        this.formSaving = false;
        this.formOpen = false;
        this.snackbar.show(message, 'success');
        this.reloadProducts();
      },
      error: (err: Error) => {
        this.formSaving = false;
        this.formError = err.message;
        this.cdr.markForCheck();
      }
    });
  }

  private reloadProducts(): void {
    this.loading = true;
    this.catalogService.getAllProducts().subscribe({
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
