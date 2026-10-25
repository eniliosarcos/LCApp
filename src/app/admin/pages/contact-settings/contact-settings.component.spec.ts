import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ContactConfig } from '../../../core/models/contact.model';
import { ContactService } from '../../../core/services/contact.service';
import { ContactSettingsComponent } from './contact-settings.component';

// Telegram guardado vacío: es el caso real (el canal no se usa y se oculta en el sitio).
const storedConfig: ContactConfig = {
  whatsapp: '521234567890',
  whatsappDisplay: '+52 123 456 7890',
  instagram: '@tu_usuario',
  telegram: ''
};

describe('ContactSettingsComponent', () => {
  let fixture: ComponentFixture<ContactSettingsComponent>;
  let component: ContactSettingsComponent;
  let updateContactSpy: jasmine.Spy;

  beforeEach(async () => {
    updateContactSpy = jasmine
      .createSpy('updateContact')
      .and.callFake((config: ContactConfig) => of(config));

    await TestBed.configureTestingModule({
      declarations: [ContactSettingsComponent],
      imports: [FormsModule],
      providers: [
        {
          provide: ContactService,
          useValue: { getContact: () => of({ ...storedConfig }), updateContact: updateContactSpy }
        }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ContactSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga la configuración guardada en el formulario', () => {
    expect(component.loading).toBeFalse();
    expect(component.form).toEqual(storedConfig);
  });

  it('permite guardar con Telegram vacío', () => {
    const submit = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(submit.disabled).toBeFalse();

    component.onSubmit();

    expect(updateContactSpy).toHaveBeenCalledWith(storedConfig);
    expect(component.saved).toBeTrue();
    expect(component.saving).toBeFalse();
  });

  it('no exige el campo de Telegram', () => {
    const input = fixture.nativeElement.querySelector('input[name="telegram"]') as HTMLInputElement;

    expect(input.hasAttribute('required')).toBeFalse();
  });

  it('mantiene obligatorios WhatsApp e Instagram', () => {
    const whatsapp = fixture.nativeElement.querySelector('input[name="whatsapp"]') as HTMLInputElement;
    const instagram = fixture.nativeElement.querySelector('input[name="instagram"]') as HTMLInputElement;

    expect(whatsapp.hasAttribute('required')).toBeTrue();
    expect(instagram.hasAttribute('required')).toBeTrue();
  });

  it('muestra el error del servicio si no se puede guardar', () => {
    updateContactSpy.and.returnValue(
      throwError(() => new Error('No se pudo guardar la configuración. Intenta de nuevo.'))
    );

    component.onSubmit();

    expect(component.errorMessage).toBe('No se pudo guardar la configuración. Intenta de nuevo.');
    expect(component.saved).toBeFalse();
    expect(component.saving).toBeFalse();
  });
});
