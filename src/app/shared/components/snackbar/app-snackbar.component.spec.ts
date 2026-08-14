import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AppSnackbarComponent } from './app-snackbar.component';

describe('AppSnackbarComponent', () => {
  let fixture: ComponentFixture<AppSnackbarComponent>;
  let component: AppSnackbarComponent;
  let service: SnackbarService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppSnackbarComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppSnackbarComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(SnackbarService);
    fixture.detectChanges();
  });

  afterEach(() => {
    service.dismiss();
  });

  it('muestra el mensaje con rol status cuando se llama show()', () => {
    service.show('Tu pedido fue actualizado.', 'success');

    fixture.detectChanges();

    expect(component.snackbar?.message).toBe('Tu pedido fue actualizado.');
    expect(component.snackbar?.type).toBe('success');
    expect(component.role).toBe('status');
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.snackbar')?.classList.contains('open')).toBeTrue();
    expect(host.querySelector('.snackbar__text')?.textContent?.trim()).toBe('Tu pedido fue actualizado.');
  });

  it('usa rol alert para errores', () => {
    service.show('No se pudo actualizar.', 'error');

    fixture.detectChanges();

    expect(component.role).toBe('alert');
  });

  it('se cierra automáticamente tras la duración configurada', fakeAsync(() => {
    service.show('Aviso temporal', 'info', 3000);
    fixture.detectChanges();

    expect(component.snackbar).not.toBeNull();

    tick(2999);
    fixture.detectChanges();
    expect(component.snackbar).not.toBeNull();

    tick(1);
    fixture.detectChanges();
    expect(component.snackbar).toBeNull();
  }));

  it('muestra un botón de acción y ejecuta su callback al pulsarlo', () => {
    const onAction = jasmine.createSpy('onAction');
    service.show('Tu carrito fue vaciado.', 'info', 5000, 'Deshacer', onAction);
    fixture.detectChanges();

    const actionButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.snackbar__action');
    expect(actionButton).toBeTruthy();
    expect(actionButton?.textContent?.trim()).toBe('Deshacer');
    actionButton?.click();
    fixture.detectChanges();

    expect(onAction).toHaveBeenCalled();
    expect(component.snackbar).toBeNull();
  });

  it('se cierra al pulsar el botón cerrar', fakeAsync(() => {
    service.show('Aviso con botón', 'info');
    fixture.detectChanges();

    const closeButton = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.snackbar__close');
    expect(closeButton).toBeTruthy();
    closeButton?.click();
    fixture.detectChanges();

    expect(component.snackbar).toBeNull();
  }));

  it('un nuevo show reemplaza el mensaje anterior y reinicia el timer', fakeAsync(() => {
    service.show('Primer aviso', 'info', 5000);
    fixture.detectChanges();

    service.show('Segundo aviso', 'success', 2000);
    fixture.detectChanges();

    expect(component.snackbar?.message).toBe('Segundo aviso');

    tick(2000);
    fixture.detectChanges();
    expect(component.snackbar).toBeNull();
  }));
});
