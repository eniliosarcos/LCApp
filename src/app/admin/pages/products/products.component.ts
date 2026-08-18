import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Category } from '../../../core/models/category.model';
import { FormImage, LOW_STOCK_THRESHOLD, Product, ProductImageVariant, ProductPayload } from '../../../core/models/product.model';
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
  images: FormImage[];
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
  images: [],
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
  form: ProductForm = { ...EMPTY_FORM, images: [] };
  pendingImageUrls: string[] = [];

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

  get inventoryValue(): number {
    return this.products.reduce((sum, p) => sum + p.price * p.stock, 0);
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
    this.form = { ...EMPTY_FORM, images: [] };
    this.pendingImageUrls = [];
    this.formError = '';
    this.formOpen = true;
    this.cdr.markForCheck();
  }

  openEdit(product: Product): void {
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
      images: (product.images || []).map((img, i) => ({
        url: img.url,
        variants: img.variants ? [...img.variants] : [],
        alt: img.alt || product.name,
        isPrimary: img.isPrimary,
        order: typeof img.order === 'number' ? img.order : i,
      })),
      isActive: product.isActive
    };
    this.pendingImageUrls = [];
    this.formError = '';
    this.formOpen = true;
    this.cdr.markForCheck();
  }

  closeForm(): void {
    if (this.formSaving) {
      return;
    }
    if (this.pendingImageUrls.length) {
      this.imageService.cancelUploads(this.pendingImageUrls).subscribe();
    }
    this.formOpen = false;
    this.pendingImageUrls = [];
    this.cdr.markForCheck();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    input.value = '';
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

    this.imageService.uploadImage(file, this.buildImageSlug()).subscribe({
      next: result => {
        const nextOrder = this.form.images.length;
        this.form.images.push({
          url: result.primaryUrl,
          variants: result.variants,
          alt: this.form.name.trim() || '',
          isPrimary: this.form.images.length === 0,
          order: nextOrder,
        });
        this.pendingImageUrls.push(result.primaryUrl);
        for (const v of result.variants) {
          this.pendingImageUrls.push(v.url);
        }
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

  removeImage(index: number): void {
    const removed = this.form.images[index];
    const wasPrimary = removed.isPrimary;
    const removedUrls = [removed.url, ...removed.variants.map(v => v.url)];
    this.form.images.splice(index, 1);
    this.form.images.forEach((img, i) => img.order = i);
    if (wasPrimary && this.form.images.length) {
      this.form.images[0].isPrimary = true;
    }
    const pendingSet = new Set(this.pendingImageUrls);
    const isPending = removedUrls.every(url => pendingSet.has(url));
    if (isPending) {
      this.pendingImageUrls = this.pendingImageUrls.filter(url => !removedUrls.includes(url));
      this.imageService.cancelUploads(removedUrls).subscribe();
    }
    this.cdr.markForCheck();
  }

  setPrimary(index: number): void {
    this.form.images.forEach((img, i) => img.isPrimary = i === index);
    this.cdr.markForCheck();
  }

  private buildImageSlug(): string {
    const name = this.form.name.trim();
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    if (this.editingProduct) {
      const last5 = this.editingProduct.id.slice(-5);
      return `${slug}-${last5}`;
    }
    return slug;
  }

  addManualUrl(): void {
    const url = (this.form as unknown as { manualUrl: string }).manualUrl?.trim();
    if (!url) {
      return;
    }
    const nextOrder = this.form.images.length;
    this.form.images.push({
      url,
      variants: [],
      alt: this.form.name.trim() || '',
      isPrimary: this.form.images.length === 0,
      order: nextOrder,
    });
    (this.form as unknown as { manualUrl: string }).manualUrl = '';
    this.cdr.markForCheck();
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

  deleteProduct(product: Product): void {
    if (!confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    this.catalogService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products = this.products.filter(p => p.id !== product.id);
        this.snackbar.show('Producto eliminado', 'success');
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
      images: this.form.images.map(img => ({
        url: img.url,
        alt: img.alt || this.form.name.trim(),
        isPrimary: img.isPrimary,
        order: img.order,
        ...(img.variants.length > 0 ? { variants: img.variants } : {})
      })),
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
        this.pendingImageUrls = [];
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
