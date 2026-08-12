import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

interface LoginResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'catalog_token';
  private readonly userKey = 'catalog_user';
  private readonly apiUrl = environment.apiUrl;

  private readonly authState$ = new BehaviorSubject<User | null>(this.storedUser());
  private readonly session = new BehaviorSubject<{ token: string; user: User } | null>(null);

  constructor(private readonly http: HttpClient) {}

  get authState(): Observable<User | null> {
    return this.authState$.asObservable();
  }

  getCurrentUser(): User | null {
    return this.authState$.getValue();
  }

  isAuthenticated(): boolean {
    return this.session.getValue() !== null || this.safeGetToken() !== null;
  }

  getToken(): string | null {
    return this.session.getValue()?.token ?? this.safeGetToken();
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap(response => {
        this.session.next({ token: response.token, user: response.user });
        this.persistSession(response);
        this.authState$.next(response.user);
      }),
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  logout(): void {
    this.session.next(null);
    this.authState$.next(null);
    this.clearStorage();
  }

  private persistSession(response: LoginResponse): void {
    try {
      localStorage.setItem(this.tokenKey, response.token);
      localStorage.setItem(this.userKey, JSON.stringify(response.user));
    } catch {
      // Storage lleno o bloqueado: la sesión queda en memoria, no persiste al recargar.
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
    } catch {
      // Storage lleno o bloqueado: no se puede limpiar.
    }
  }

  private safeGetToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch {
      return null;
    }
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.status === 401 ? 'Usuario o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta de nuevo.';
    return throwError(() => new Error(message));
  }

  private storedUser(): User | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
