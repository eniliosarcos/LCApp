import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppLoadingSpinnerComponent } from './loading-spinner.component';

describe('AppLoadingSpinnerComponent', () => {
  let fixture: ComponentFixture<AppLoadingSpinnerComponent>;
  let component: AppLoadingSpinnerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppLoadingSpinnerComponent]
    }).compileComponents();
  });

  function createComponent(label?: string): void {
    fixture = TestBed.createComponent(AppLoadingSpinnerComponent);
    component = fixture.componentInstance;
    component.label = label ?? '';
    fixture.detectChanges();
  }

  it('muestra el anillo y el label', () => {
    createComponent('Cargando órdenes…');

    const el = fixture.nativeElement;
    expect(el.querySelector('.ring')).not.toBeNull();
    expect(el.textContent).toContain('Cargando órdenes…');
  });

  it('anuncia el estado con role=status y aria-live', () => {
    createComponent();

    const host = fixture.nativeElement.querySelector('.loading-spinner');
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-live')).toBe('polite');
    expect(host.querySelector('.ring').getAttribute('aria-hidden')).toBe('true');
  });

  it('no muestra el label si no se pasa', () => {
    createComponent();

    expect(fixture.nativeElement.querySelector('.label')).toBeNull();
  });

  it('aplica la clase del tamaño solicitado', () => {
    fixture = TestBed.createComponent(AppLoadingSpinnerComponent);
    component = fixture.componentInstance;
    component.size = 'lg';
    fixture.detectChanges();

    const host = fixture.nativeElement.querySelector('.loading-spinner');
    expect(host.classList.contains('lg')).toBeTrue();
    expect(host.classList.contains('sm')).toBeFalse();
  });
});
