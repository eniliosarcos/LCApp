import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AddPaymentRequest, CreateCreditSaleRequest, CreateManualOrderRequest, CreditSalePage, Order, OrderSummary } from '../models/order.model';
import { OrderService } from './order.service';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), OrderService]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getSummary() hace GET /api/orders/summary con el rango', () => {
    const summary: OrderSummary = {
      range: 'week',
      from: '2026-08-10T00:00:00.000Z',
      to: '2026-08-14T00:00:00.000Z',
      sales: 4,
      cancelled: 2,
      pending: 1,
      totalOrders: 7,
      revenue: 463.45,
      units: 9,
      topProducts: [],
      byCategory: []
    };

    let result!: OrderSummary;
    service.getSummary('week').subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'GET' && r.url.endsWith('/api/orders/summary') && r.params.get('range') === 'week');
    req.flush(summary);

    expect(result).toEqual(summary);
  });

  it('createManualOrder() hace POST /api/orders/manual con el payload', () => {
    const request: CreateManualOrderRequest = {
      customerName: 'María',
      saleDate: '2026-08-14',
      items: [{ productId: 'p1', quantity: 3, price: 45 }]
    };

    let result!: Order;
    service.createManualOrder(request).subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/orders/manual'));
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'o1', code: 'MAN-AB12C' } as Order);

    expect(result).toEqual({ id: 'o1', code: 'MAN-AB12C' } as Order);
  });

  it('createCreditSale() hace POST /api/orders/credit con el payload', () => {
    const request: CreateCreditSaleRequest = {
      customerName: 'María',
      customerPhone: '12345678',
      items: [{ productId: 'p1', quantity: 2, price: 45 }]
    };

    let result!: Order;
    service.createCreditSale(request).subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/orders/credit'));
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'o1', code: 'FIA-AB12C', source: 'fiado' } as Order);

    expect(result).toEqual({ id: 'o1', code: 'FIA-AB12C', source: 'fiado' } as Order);
  });

  it('getCreditSales() envía page, limit, paymentStatus y q recortado', () => {
    const page: CreditSalePage = {
      orders: [],
      total: 0,
      page: 2,
      limit: 10,
      totalPages: 0,
      totalPending: 0
    };

    let result!: CreditSalePage;
    service.getCreditSales(2, 10, 'partial', '  maria  ').subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'GET' && r.url.endsWith('/api/orders/credit'));
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('paymentStatus')).toBe('partial');
    expect(req.request.params.get('q')).toBe('maria');
    req.flush(page);

    expect(result).toEqual(page);
  });

  it('getCreditSales() sin filtros no envía paymentStatus ni q', () => {
    let result!: CreditSalePage;
    service.getCreditSales().subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'GET' && r.url.endsWith('/api/orders/credit'));
    expect(req.request.params.get('paymentStatus')).toBeNull();
    expect(req.request.params.get('q')).toBeNull();
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('limit')).toBe('10');
    req.flush({ orders: [], total: 0, page: 1, limit: 10, totalPages: 0, totalPending: 0 });

    expect(result.total).toBe(0);
  });

  it('addPayment() hace POST /api/orders/:id/payments con el payload', () => {
    const request: AddPaymentRequest = { amount: 25, note: 'Abono' };

    let result!: Order;
    service.addPayment('o1', request).subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/orders/o1/payments'));
    expect(req.request.body).toEqual(request);
    req.flush({ id: 'o1', amountPaid: 25, paymentStatus: 'partial' } as Order);

    expect(result).toEqual({ id: 'o1', amountPaid: 25, paymentStatus: 'partial' } as Order);
  });
});
