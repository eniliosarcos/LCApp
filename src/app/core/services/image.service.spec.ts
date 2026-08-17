import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ImageService } from './image.service';

describe('ImageService', () => {
  let service: ImageService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), ImageService]
    });
    service = TestBed.inject(ImageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('uploadImage() hace POST /api/images con la imagen como FormData', () => {
    const file = new File(['data'], 'foto.jpg', { type: 'image/jpeg' });

    let result!: { primaryUrl: string };
    service.uploadImage(file).subscribe(value => (result = value));

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/images'));
    expect(req.request.body instanceof FormData).toBeTrue();
    const sentFile = (req.request.body as FormData).get('file') as File;
    expect(sentFile.name).toBe('foto.jpg');
    expect(sentFile.type).toBe('image/jpeg');

    req.flush({
      primaryUrl: 'https://img.example/400w.webp',
      variants: [
        { width: 400, url: 'https://img.example/400w.webp' },
        { width: 800, url: 'https://img.example/800w.webp' }
      ]
    });

    expect(result.primaryUrl).toBe('https://img.example/400w.webp');
  });

  it('propaga el mensaje de error del servidor', () => {
    const file = new File(['data'], 'foto.jpg', { type: 'image/jpeg' });
    let error!: Error;

    service.uploadImage(file).subscribe({
      error: err => (error = err)
    });

    const req = httpMock.expectOne(r => r.method === 'POST' && r.url.endsWith('/api/images'));
    req.flush({ error: 'La imagen no puede superar los 5 MB' }, { status: 400, statusText: 'Bad Request' });

    expect(error.message).toBe('La imagen no puede superar los 5 MB');
  });
});
