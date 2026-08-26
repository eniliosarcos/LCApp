import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Category } from '../models/category.model';
import { Product, ProductPayload } from '../models/product.model';

export interface CategoryPayload {
  name: string;
  description?: string;
  imageUrl?: string;
}

const DEFAULT_ERROR = 'No se pudo completar la operación. Intenta de nuevo.';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/categories`).pipe(
      catchError(this.handleError),
      shareReplay(1)
    );
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
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      catchError(this.handleError),
      shareReplay(1)
    );
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

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products?all=true`).pipe(catchError(this.handleError));
  }

  createProduct(payload: ProductPayload): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, payload).pipe(catchError(this.handleError));
  }

  updateProduct(productId: string, payload: Partial<ProductPayload>): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/products/${productId}`, payload).pipe(catchError(this.handleError));
  }

  deleteProduct(productId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${productId}`).pipe(catchError(this.handleError));
  }

  createCategory(payload: CategoryPayload): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/categories`, payload).pipe(catchError(this.handleError));
  }

  updateCategory(categoryId: string, payload: Partial<CategoryPayload>): Observable<Category> {
    return this.http.put<Category>(`${this.apiUrl}/categories/${categoryId}`, payload).pipe(catchError(this.handleError));
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const serverMessage = error.error?.error;
      if (serverMessage) {
        return throwError(() => new Error(serverMessage));
      }
    }
    console.error('Error en el catálogo:', error);
    return throwError(() => new Error(DEFAULT_ERROR));
  }
}
