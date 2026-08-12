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

  constructor(private readonly http: HttpClient) {}

  get authState(): Observable<User | null> {
    return this.authState$.asObservable();
  }

  getCurrentUser(): User | null {
    return this.authState$.getValue();
  }

  isAuthenticated(): boolean {
    return localStorage.getItem(this.tokenKey) !== null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  login(username: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { username, password }).pipe(
      tap(response => {
        localStorage.setItem(this.tokenKey, response.token);
        localStorage.setItem(this.userKey, JSON.stringify(response.user));
        this.authState$.next(response.user);
      }),
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.authState$.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const message =
      error.status === 401 ? 'Usuario o contraseña incorrectos.' : 'No se pudo iniciar sesión. Intenta de nuevo.';
    return throwError(() => new Error(message));
  }

  private storedUser(): User | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
