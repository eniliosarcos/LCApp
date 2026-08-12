import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CreateOrderRequest, Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  createOrder(request: CreateOrderRequest): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, request).pipe(catchError(this.handleError));
  }

  private handleError(error: unknown): Observable<never> {
    console.error('Error creando la orden:', error);
    return throwError(() => new Error('No se pudo registrar tu pedido. Intenta de nuevo.'));
  }
}
