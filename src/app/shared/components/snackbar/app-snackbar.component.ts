import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, Subscription, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SnackbarData, SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  templateUrl: './app-snackbar.component.html',
  styleUrls: ['./app-snackbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSnackbarComponent implements OnInit, OnDestroy {
  snackbar: SnackbarData | null = null;

  private readonly destroy$ = new Subject<void>();
  private closeTimer: Subscription | null = null;

  constructor(
    private readonly snackbarService: SnackbarService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get role(): 'alert' | 'status' {
    return this.snackbar?.type === 'error' ? 'alert' : 'status';
  }

  ngOnInit(): void {
    this.snackbarService
      .getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.resetTimer();
        this.snackbar = data;
        if (data) {
          this.closeTimer = timer(data.duration ?? 4000)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.dismiss());
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.resetTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  dismiss(): void {
    this.snackbarService.dismiss();
  }

  onAction(): void {
    this.snackbar?.onAction?.();
    this.dismiss();
  }

  private resetTimer(): void {
    this.closeTimer?.unsubscribe();
    this.closeTimer = null;
  }
}
