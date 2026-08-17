import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
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

  uploadImage(file: File): Observable<ImageUploadResult> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<ImageUploadResult>(`${this.apiUrl}/images`, formData).pipe(catchError(this.handleError));
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
