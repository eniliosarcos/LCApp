import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModalComponent } from '../modal/app-modal.component';
import { AppConfirmDialogComponent } from './app-confirm-dialog.component';

@Component({
  template: `
    <app-confirm-dialog
      [open]="open"
      [title]="title"
      [message]="message"
      [confirmLabel]="confirmLabel"
      [cancelLabel]="cancelLabel"
      [variant]="variant"
      (confirmed)="onConfirmed()"
      (cancelled)="onCancelled()">
    </app-confirm-dialog>
  `
})
class HostComponent {
  open = false;
  title = 'Confirmar orden';
  message = '¿Confirmar la venta?';
  confirmLabel = 'Confirmar';
  cancelLabel = 'Cancelar';
  variant: 'confirm' | 'cancel' = 'confirm';
  onConfirmed = jasmine.createSpy('onConfirmed');
  onCancelled = jasmine.createSpy('onCancelled');

  @ViewChild(AppConfirmDialogComponent) dialog!: AppConfirmDialogComponent;
}

describe('AppConfirmDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [AppConfirmDialogComponent, AppModalComponent, HostComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('modal-lock');
  });

  function openDialog(): void {
    host.open = true;
    fixture.detectChanges();
  }

  it('no renderiza el overlay cuando open es false', () => {
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
  });

  it('renderiza el título y el mensaje cuando open es true', () => {
    openDialog();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Confirmar orden');
    expect(text).toContain('¿Confirmar la venta?');
  });

  it('emite confirmed al aceptar', () => {
    openDialog();
    const buttons = fixture.nativeElement.querySelectorAll('.confirm-dialog__btn') as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    expect(host.onConfirmed).toHaveBeenCalledTimes(1);
    expect(host.onCancelled).not.toHaveBeenCalled();
  });

  it('emite cancelled al cancelar', () => {
    openDialog();
    const buttons = fixture.nativeElement.querySelectorAll('.confirm-dialog__btn') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    expect(host.onCancelled).toHaveBeenCalledTimes(1);
    expect(host.onConfirmed).not.toHaveBeenCalled();
  });

  it('emite cancelled al cerrar el modal por backdrop o esc', () => {
    openDialog();
    host.dialog.onCancel();
    expect(host.onCancelled).toHaveBeenCalledTimes(1);
  });

  it('aplica la variante danger para cancelaciones', () => {
    host.variant = 'cancel';
    host.confirmLabel = 'Cancelar orden';
    openDialog();
    const dangerBtn = fixture.nativeElement.querySelector('.confirm-dialog__btn--danger') as HTMLButtonElement;
    expect(dangerBtn).not.toBeNull();
    expect(dangerBtn.textContent).toContain('Cancelar orden');
  });
});
