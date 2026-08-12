import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(catchError(this.handleError));
  }

  getCategoryById(categoryId: string): Observable<Category | undefined> {
    return this.getCategories().pipe(
      map(categories => categories.find(category => category.id === categoryId))
    );
  }

  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.getProducts().pipe(
      map(products => products.filter(product => product.categoryId === categoryId && product.isActive))
    );
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(catchError(this.handleError));
  }

  getProductById(productId: string): Observable<Product | undefined> {
    return this.getProducts().pipe(
      map(products => products.find(product => product.id === productId && product.isActive))
    );
  }

  getProductBySlug(slug: string): Observable<Product | undefined> {
    return this.getProducts().pipe(
      map(products => products.find(product => product.slug === slug && product.isActive))
    );
  }

  private handleError(error: unknown): Observable<never> {
    console.error('Error cargando datos del catálogo:', error);
    return throwError(() => new Error('No se pudo cargar el catálogo. Intenta de nuevo.'));
  }
}
