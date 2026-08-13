import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, tap } from 'rxjs/operators';
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
        next: config => this.contact$.next(config),
        error: err => {
          console.error('Error cargando la configuración de contacto:', err);
          this.contact$.next(this.emptyConfig());
        }
      });
    }
    return this.contact$.pipe(filter((config): config is ContactConfig => config !== null));
  }

  updateContact(config: ContactConfig): Observable<ContactConfig> {
    return this.http.put<ContactConfig>(`${this.apiUrl}/config`, config).pipe(
      tap(updated => this.contact$.next(updated)),
      catchError((error: HttpErrorResponse) => {
        console.error('Error guardando la configuración de contacto:', error);
        return throwError(() => new Error('No se pudo guardar la configuración. Intenta de nuevo.'));
      })
    );
  }

  private emptyConfig(): ContactConfig {
    return { whatsapp: '', whatsappDisplay: '', instagram: '', telegram: '' };
  }
}
