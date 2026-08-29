import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CreateCreditSaleRequest, CreateManualOrderRequest } from '../../../../core/models/order.model';
import { Product } from '../../../../core/models/product.model';
import { CatalogService } from '../../../../core/services/catalog.service';
import { OrderService } from '../../../../core/services/order.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';

export interface ManualSaleLine {
  productId: string;
  quantity: number;
  price: number | null;
}

const EMPTY_LINE: ManualSaleLine = { productId: '', quantity: 1, price: null };

@Component({
  selector: 'app-manual-sale-modal',
  templateUrl: './manual-sale-modal.component.html',
  styleUrls: ['./manual-sale-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManualSaleModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  products: Product[] = [];
  customerName = '';
  customerPhone = '';
  saleDate = '';
  lines: ManualSaleLine[] = [{ ...EMPTY_LINE }];
  isCredit = false;
  formError = '';
  showError = false;
  saving = false;
  confirming = false;
  private wasOpen = false;

  @Input()
  set open(value: boolean) {
    if (value && !this.wasOpen) {
      this.resetForm();
    }
    this.wasOpen = value;
  }

  get open(): boolean {
    return this.wasOpen;
  }

  constructor(
    private readonly catalogService: CatalogService,
    private readonly orderService: OrderService,
    private readonly snackbar: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  get activeProducts(): Product[] {
    return this.products.filter(product => product.isActive);
  }

  get total(): number {
    return this.lines.reduce((sum, line) => sum + this.lineUnitPrice(line) * Math.max(0, Number(line.quantity) || 0), 0);
  }

  get hasCompleteLines(): boolean {
    return this.lines.some(line => line.productId && Number(line.quantity) > 0);
  }

  todayString(): string {
    return this.toDateString(new Date());
  }

  effectivePrice(product: Product): number {
    return product.discountPrice ?? product.price;
  }

  lineUnitPrice(line: ManualSaleLine): number {
    return line.price ?? this.lineEffectivePrice(line) ?? 0;
  }

  lineEffectivePrice(line: ManualSaleLine): number | null {
    const product = this.lineProduct(line);
    return product ? this.effectivePrice(product) : null;
  }

  lineProduct(line: ManualSaleLine): Product | undefined {
    return this.products.find(product => product.id === line.productId);
  }

  quantityMax(line: ManualSaleLine): number {
    return this.lineProduct(line)?.stock ?? 0;
  }

  lineTrackBy(index: number): number {
    return index;
  }

  productTrackBy(_index: number, product: Product): string {
    return product.id;
  }

  onProductChange(index: number, productId: string): void {
    const line = this.lines[index];
    if (!line) {
      return;
    }
    line.productId = productId;
    if (line.price === null) {
      line.price = this.lineEffectivePrice(line);
    }
    this.cdr.markForCheck();
  }

  addLine(): void {
    this.lines.push({ ...EMPTY_LINE });
    this.cdr.markForCheck();
  }

  removeLine(index: number): void {
    if (this.lines.length === 1) {
      return;
    }
    this.lines.splice(index, 1);
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    const validationError = this.validate();
    if (validationError) {
      this.showFormError(validationError);
      return;
    }
    this.formError = '';
    this.confirming = true;
    this.cdr.markForCheck();
  }

  runConfirm(): void {
    if (this.saving) {
      return;
    }
    this.confirming = false;
    this.saving = true;
    this.formError = '';
    this.showError = false;
    this.cdr.markForCheck();

    const items = this.lines.map(line => ({
      productId: line.productId,
      quantity: Number(line.quantity),
      price: line.price === null ? undefined : Number(line.price),
    }));

    if (this.isCredit) {
      const request: CreateCreditSaleRequest = {
        customerName: this.customerName.trim(),
        customerPhone: this.customerPhone.trim(),
        items,
      };
      this.orderService.createCreditSale(request).subscribe({
        next: order => {
          this.saving = false;
          this.snackbar.show(`Fiado ${order.code} registrado`, 'success');
          this.saved.emit();
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.saving = false;
          this.showFormError(err.message);
        }
      });
    } else {
      const request: CreateManualOrderRequest = {
        customerName: this.customerName.trim() || undefined,
        customerPhone: this.customerPhone.trim() || undefined,
        saleDate: this.saleDate ? this.toISOWithOffset(this.saleDate) : undefined,
        items,
      };
      this.orderService.createManualOrder(request).subscribe({
        next: order => {
          this.saving = false;
          this.snackbar.show(`Venta ${order.code} registrada`, 'success');
          this.saved.emit();
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.saving = false;
          this.showFormError(err.message);
        }
      });
    }
  }

  cancelConfirm(): void {
    this.confirming = false;
    this.cdr.markForCheck();
  }

  dismissError(): void {
    this.showError = false;
    this.cdr.markForCheck();
  }

  confirmMessage(): string {
    const customer = this.customerName.trim() || 'Cliente de mostrador';
    const itemsCount = this.lines.filter(line => line.productId && Number(line.quantity) > 0).length;
    const dateLabel = this.saleDate ? this.formatDate(this.saleDate) : this.formatDate(this.todayString());
    const type = this.isCredit ? 'fiado' : 'venta';
    const extra = this.isCredit ? ' · El cliente pagará después' : '';
    return `Cliente: ${customer} · ${dateLabel} · ${itemsCount} producto(s) · Total: ${this.formatCurrency(this.total)}. ¿Confirmar el ${type}?${extra} El stock se descontará.`;
  }

  close(): void {
    if (this.saving) {
      return;
    }
    this.confirming = false;
    this.closed.emit();
  }

  private resetForm(): void {
    this.customerName = '';
    this.customerPhone = '';
    this.saleDate = this.todayString();
    this.lines = [{ ...EMPTY_LINE }];
    this.isCredit = false;
    this.formError = '';
    this.showError = false;
    this.saving = false;
    this.confirming = false;
    this.cdr.markForCheck();
  }

  private showFormError(message: string): void {
    this.formError = message;
    this.showError = true;
    this.cdr.markForCheck();
  }

  private validate(): string {
    if (this.isCredit) {
      if (!this.customerName.trim()) {
        return 'El nombre del cliente es obligatorio para ventas a crédito.';
      }
      if (!this.customerPhone.trim()) {
        return 'El teléfono del cliente es obligatorio para ventas a crédito.';
      }
    }
    if (this.lines.length === 0 || !this.lines.some(line => line.productId)) {
      return 'Agregá al menos un producto a la venta.';
    }
    for (const line of this.lines) {
      const product = this.lineProduct(line);
      if (!line.productId) {
        continue;
      }
      if (!product) {
        return 'Uno de los productos ya no está disponible.';
      }
      const quantity = Number(line.quantity);
      if (!Number.isFinite(quantity) || quantity < 1) {
        return `Cantidad inválida para "${product.name}".`;
      }
      if (quantity > product.stock) {
        return `Stock insuficiente para "${product.name}": disponible ${product.stock}, solicitado ${quantity}.`;
      }
      if (line.price !== null && (Number.isNaN(Number(line.price)) || Number(line.price) < 0)) {
        return `Precio inválido para "${product.name}".`;
      }
    }
    return '';
  }

  private loadProducts(): void {
    this.catalogService.getAllProducts().subscribe({
      next: products => {
        this.products = products;
        this.cdr.markForCheck();
      },
      error: () => {
        this.showFormError('No se pudieron cargar los productos.');
      }
    });
  }

  private toDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toISOWithOffset(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day, 0, 0, 0);
    const offset = -d.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const absOffset = Math.abs(offset);
    const hh = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const mm = String(absOffset % 60).padStart(2, '0');
    return `${dateStr}T00:00:00.000${sign}${hh}:${mm}`;
  }

  private formatDate(date: string): string {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }
}
