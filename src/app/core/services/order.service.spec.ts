import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { OrderSummary } from '../models/order.model';
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
});
