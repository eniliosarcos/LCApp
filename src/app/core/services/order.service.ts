import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateOrderRequest, Order, OrderItem, OrderPage, OrderStats, OrderStatusResponse, OrderSummary, SummaryRange } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, request).pipe(catchError(this.handleError));
  }

  getOrders(page = 1, limit = 10, status?: string, q?: string): Observable<OrderPage> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (status) {
      params = params.set('status', status);
    }
    if (q && q.trim()) {
      params = params.set('q', q.trim());
    }
    return this.http.get<OrderPage>(`${this.apiUrl}/orders`, { params }).pipe(catchError(this.handleError));
  }

  getOrderStatus(code: string): Observable<OrderStatusResponse> {
    return this.http.get<OrderStatusResponse>(`${this.apiUrl}/orders/${code}/status`).pipe(catchError(this.handleError));
  }

  getOrderByCode(code: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${code}`).pipe(catchError(this.handleError));
  }

  updateOrderItems(code: string, items: OrderItem[]): Observable<Order> {
    return this.http
      .patch<Order>(`${this.apiUrl}/orders/${code}/items`, { items })
      .pipe(catchError(this.handleError));
  }

  getStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.apiUrl}/orders/stats`).pipe(catchError(this.handleError));
  }

  getSummary(range: SummaryRange): Observable<OrderSummary> {
    const params = new HttpParams().set('range', range);
    return this.http.get<OrderSummary>(`${this.apiUrl}/orders/summary`, { params }).pipe(catchError(this.handleError));
  }

  confirmOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/orders/${orderId}/confirm`, {}).pipe(catchError(this.handleError));
  }

  cancelOrder(orderId: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/orders/${orderId}/cancel`, {}).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      typeof error.error === 'object' && error.error?.error
        ? error.error.error
        : 'No se pudieron cargar los datos. Intenta de nuevo.';
    const wrapped = new Error(message) as Error & { status?: number };
    wrapped.status = error.status;
    console.error('Error del servicio de órdenes:', error);
    return throwError(() => wrapped);
  }
}
