import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactConfig } from '../models/contact.model';
import { ContactService } from './contact.service';
import { HttpContactService } from './http-contact.service';

describe('HttpContactService', () => {
  let service: HttpContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: ContactService, useClass: HttpContactService }]
    });
    service = TestBed.inject(ContactService) as HttpContactService;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('se inyecta como ContactService (provider abstracto)', () => {
    expect(service).toBeInstanceOf(HttpContactService);
    const provided = TestBed.inject(ContactService);
    expect(provided).toBe(service);
  });

  it('getContact() hace GET /api/config y emite la config', () => {
    const config: ContactConfig = {
      whatsapp: '521234567890',
      whatsappDisplay: '+52 123 456 7890',
      instagram: '@tu_usuario',
      telegram: '@tu_usuario'
    };

    let result!: ContactConfig;
    service.getContact().subscribe(value => (result = value));
    httpMock.expectOne('http://localhost:3000/api/config').flush(config);

    expect(result).toEqual(config);
  });

  it('getContact() cachea: un solo GET para múltiples suscriptores', () => {
    service.getContact().subscribe();
    service.getContact().subscribe();
    httpMock.expectOne('http://localhost:3000/api/config').flush({} as ContactConfig);
    expect(() => httpMock.expectOne('http://localhost:3000/api/config')).toThrow();
  });

  it('getContact() emite config vacía si el GET falla', () => {
    let result!: ContactConfig;
    service.getContact().subscribe(value => (result = value));
    httpMock.expectOne('http://localhost:3000/api/config').flush('boom', {
      status: 500,
      statusText: 'Server Error'
    });

    expect(result).toEqual({ whatsapp: '', whatsappDisplay: '', instagram: '', telegram: '' });
  });

  it('updateContact() hace PUT /api/config y emite la config actualizada', () => {
    const config: ContactConfig = {
      whatsapp: '5491198765432',
      whatsappDisplay: '+54 9 11 8765 4321',
      instagram: '@nuevo',
      telegram: '@nuevo'
    };

    let result!: ContactConfig;
    service.updateContact(config).subscribe(value => (result = value));
    const req = httpMock.expectOne('http://localhost:3000/api/config');
    expect(req.request.method).toBe('PUT');
    req.flush(config);

    expect(result).toEqual(config);
  });

  it('updateContact() propaga error legible si el PUT falla', () => {
    const config: ContactConfig = {
      whatsapp: '5491198765432',
      whatsappDisplay: '+54 9 11 8765 4321',
      instagram: '@nuevo',
      telegram: '@nuevo'
    };

    let errorMessage = '';
    service.updateContact(config).subscribe({
      next: () => fail('no debería emitir'),
      error: (err: Error) => (errorMessage = err.message)
    });
    const req = httpMock.expectOne('http://localhost:3000/api/config');
    req.flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

    expect(errorMessage).toBe('No se pudo guardar la configuración. Intenta de nuevo.');
  });
});
