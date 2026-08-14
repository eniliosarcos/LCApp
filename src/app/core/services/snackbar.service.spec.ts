import { TestBed } from '@angular/core/testing';
import { SnackbarService } from './snackbar.service';

describe('SnackbarService', () => {
  let service: SnackbarService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SnackbarService);
  });

  it('show publica el mensaje con tipo y duración por defecto', () => {
    let data: unknown = null;
    service.getData().subscribe(value => (data = value));

    service.show('Hola mundo', 'info');

    expect(data).toEqual({ message: 'Hola mundo', type: 'info', duration: 4000 });
  });

  it('show respeta el tipo y duración pasados', () => {
    let data: unknown = null;
    service.getData().subscribe(value => (data = value));

    service.show('Error grave', 'error', 7000);

    expect(data).toEqual({ message: 'Error grave', type: 'error', duration: 7000 });
  });

  it('show incluye la acción opcional', () => {
    const onAction = jasmine.createSpy('onAction');
    let data: unknown = null;
    service.getData().subscribe(value => (data = value));

    service.show('Tu carrito fue vaciado.', 'info', 5000, 'Deshacer', onAction);

    expect(data).toEqual({
      message: 'Tu carrito fue vaciado.',
      type: 'info',
      duration: 5000,
      actionLabel: 'Deshacer',
      onAction
    });
  });

  it('dismiss limpia el aviso actual', () => {
    service.show('Aviso', 'info');

    service.dismiss();

    let data: unknown = null;
    service.getData().subscribe(value => (data = value));
    expect(data).toBeNull();
  });

  it('emite null inicialmente', () => {
    let data: unknown = 'x';
    service.getData().subscribe(value => (data = value));

    expect(data).toBeNull();
  });
});
