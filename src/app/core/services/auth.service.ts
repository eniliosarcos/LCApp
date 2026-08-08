import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'catalog_token';
  private readonly userKey = 'catalog_user';
  private readonly credentials = { username: 'admin', password: 'admin123' };

  private readonly authState$ = new BehaviorSubject<User | null>(this.storedUser());

  get authState(): Observable<User | null> {
    return this.authState$.asObservable();
  }

  getCurrentUser(): User | null {
    return this.authState$.getValue();
  }

  isAuthenticated(): boolean {
    return localStorage.getItem(this.tokenKey) !== null;
  }

  login(username: string, password: string): Promise<User> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (username === this.credentials.username && password === this.credentials.password) {
          const user: User = { username, displayName: 'Administrador', role: 'admin' };
          localStorage.setItem(this.tokenKey, 'mock-token');
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.authState$.next(user);
          resolve(user);
        } else {
          reject(new Error('Credenciales inválidas'));
        }
      }, 400);
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.authState$.next(null);
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
