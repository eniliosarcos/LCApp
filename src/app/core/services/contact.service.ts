import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactConfig } from '../models/environment.model';

@Injectable()
export abstract class ContactService {
  abstract getContact(): Observable<ContactConfig>;
  abstract updateContact(config: ContactConfig): Observable<ContactConfig>;
}
