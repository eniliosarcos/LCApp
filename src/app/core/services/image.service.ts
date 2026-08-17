import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ProductImageVariant } from '../models/product.model';

export interface ImageUploadResult {
  variants: ProductImageVariant[];
  primaryUrl: string;
}

const DEFAULT_ERROR = 'No se pudo subir la imagen. Intenta de nuevo.';

@Injectable({ providedIn: 'root' })
export class ImageService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  uploadImage(file: File, slug?: string): Observable<ImageUploadResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (slug) {
      formData.append('slug', slug);
    }
    return this.http.post<ImageUploadResult>(`${this.apiUrl}/images`, formData).pipe(catchError(this.handleError));
  }

  cancelUploads(urls: string[]): Observable<void> {
    if (!urls.length) {
      return of(undefined);
    }
    return this.http.delete<void>(`${this.apiUrl}/images`, { body: { urls } }).pipe(catchError(this.handleError));
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const serverMessage = error.error?.error;
      if (serverMessage) {
        return throwError(() => new Error(serverMessage));
      }
    }
    console.error('Error al subir la imagen:', error);
    return throwError(() => new Error(DEFAULT_ERROR));
  }
}
