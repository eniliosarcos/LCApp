import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContactConfig } from '../models/contact.model';
import { ContactService } from './contact.service';

@Injectable()
export class HttpContactService extends ContactService {
  private readonly apiUrl = environment.apiUrl;
  private readonly contact$ = new BehaviorSubject<ContactConfig | null>(null);
  private requested = false;

  constructor(private readonly http: HttpClient) {
    super();
  }

  getContact(): Observable<ContactConfig> {
    if (!this.requested) {
      this.requested = true;
      this.http.get<ContactConfig>(`${this.apiUrl}/config`).subscribe({
        next: config => this.contact$.next(this.normalize(config)),
        error: err => {
          console.error('Error cargando la configuración de contacto:', err);
          this.contact$.next(this.emptyConfig());
        }
      });
    }
    return this.contact$.pipe(filter((config): config is ContactConfig => config !== null));
  }

  updateContact(config: ContactConfig): Observable<ContactConfig> {
    const normalized = this.normalize(config);
    return this.http.put<ContactConfig>(`${this.apiUrl}/config`, normalized).pipe(
      map(updated => this.normalize(updated)),
      tap(stored => this.contact$.next(stored)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error guardando la configuración de contacto:', error);
        return throwError(() => new Error('No se pudo guardar la configuración. Intenta de nuevo.'));
      })
    );
  }

  private emptyConfig(): ContactConfig {
    return { whatsapp: '', whatsappDisplay: '', instagram: '', telegram: '' };
  }

  /**
   * Un canal con solo espacios cuenta como vacío: el sitio oculta su botón,
   * así que el valor recortado es la única fuente de verdad.
   */
  private normalize(config: ContactConfig): ContactConfig {
    return {
      whatsapp: (config.whatsapp ?? '').trim(),
      whatsappDisplay: (config.whatsappDisplay ?? '').trim(),
      instagram: (config.instagram ?? '').trim(),
      telegram: (config.telegram ?? '').trim()
    };
  }
}
