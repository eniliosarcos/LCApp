import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './app-modal.component.html',
  styleUrls: ['./app-modal.component.scss']
})
export class AppModalComponent implements OnChanges, OnDestroy {
  @Input() open = false;
  @Input() title = '';
  @Input() showClose = true;
  @Input() dismissible = true;
  @Output() close = new EventEmitter<void>();

  @ViewChild('dialogPanel') private readonly panel?: ElementRef<HTMLDivElement>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['open']) {
      if (this.open) {
        document.body.classList.add('modal-lock');
        setTimeout(() => this.panel?.nativeElement.focus());
      } else {
        document.body.classList.remove('modal-lock');
      }
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('modal-lock');
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.open && this.dismissible) {
      this.close.emit();
    }
  }

  onBackdropClick(): void {
    if (this.dismissible) {
      this.close.emit();
    }
  }
}
