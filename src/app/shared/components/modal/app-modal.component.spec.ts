import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModalComponent } from './app-modal.component';

@Component({
  template: `
    <app-modal
      [open]="open"
      [title]="title"
      [showClose]="showClose"
      [dismissible]="dismissible"
      (close)="onClose()">
      <p>Contenido del modal</p>
    </app-modal>
  `
})
class HostComponent {
  open = false;
  title = 'Título';
  showClose = true;
  dismissible = true;
  onClose = jasmine.createSpy('onClose');

  @ViewChild(AppModalComponent) modal!: AppModalComponent;
}

describe('AppModalComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppModalComponent, HostComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('modal-lock');
  });

  function openModal(): void {
    host.open = true;
    fixture.detectChanges();
  }

  it('no renderiza contenido cuando open es false', () => {
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
  });

  it('renderiza el overlay cuando open es true', () => {
    openModal();
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.modal-body').textContent).toContain('Contenido del modal');
  });

  it('muestra el título cuando se provee', () => {
    openModal();
    expect(fixture.nativeElement.querySelector('h2').textContent).toContain('Título');
  });

  it('emite close al hacer clic en el botón de cerrar', () => {
    openModal();
    const closeBtn = fixture.nativeElement.querySelector('.modal-close');
    closeBtn.click();
    expect(host.onClose).toHaveBeenCalled();
  });

  it('oculta el botón de cerrar cuando showClose es false', () => {
    host.showClose = false;
    openModal();
    expect(fixture.nativeElement.querySelector('.modal-close')).toBeNull();
  });

  it('emite close al hacer clic en el backdrop cuando dismissible', () => {
    openModal();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    overlay.click();
    expect(host.onClose).toHaveBeenCalled();
  });

  it('no emite close al hacer clic en el backdrop cuando no es dismissible', () => {
    host.dismissible = false;
    openModal();
    const overlay = fixture.nativeElement.querySelector('.modal-overlay');
    overlay.click();
    expect(host.onClose).not.toHaveBeenCalled();
  });

  it('emite close con la tecla Escape cuando dismissible', () => {
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.onClose).toHaveBeenCalled();
  });

  it('no emite close con Escape cuando no es dismissible', () => {
    host.dismissible = false;
    openModal();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.onClose).not.toHaveBeenCalled();
  });

  it('bloquea el scroll del body mientras está abierto', () => {
    expect(document.body.classList.contains('modal-lock')).toBeFalse();
    openModal();
    expect(document.body.classList.contains('modal-lock')).toBeTrue();
    host.open = false;
    fixture.detectChanges();
    expect(document.body.classList.contains('modal-lock')).toBeFalse();
  });
});
