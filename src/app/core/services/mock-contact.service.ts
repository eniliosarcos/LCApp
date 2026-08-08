import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ContactConfig } from '../models/environment.model';
import { ContactService } from './contact.service';

const CONTACT_KEY = 'contact_config';

@Injectable()
export class MockContactService extends ContactService {
  private readonly contact$ = new BehaviorSubject<ContactConfig>(this.getStoredContact());

  getContact(): Observable<ContactConfig> {
    return this.contact$.asObservable();
  }

  updateContact(config: ContactConfig): Observable<ContactConfig> {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(config));
    this.contact$.next(config);
    return of(config);
  }

  private getStoredContact(): ContactConfig {
    const stored = localStorage.getItem(CONTACT_KEY);
    if (stored) {
      try {
        return { ...environment.contact, ...this.withoutEmpty(JSON.parse(stored)) };
      } catch {
        // fallback to environment defaults
      }
    }
    return { ...environment.contact };
  }

  private withoutEmpty(config: Partial<ContactConfig>): Partial<ContactConfig> {
    return Object.fromEntries(
      Object.entries(config).filter(([, value]) => value !== '')
    ) as Partial<ContactConfig>;
  }
}
