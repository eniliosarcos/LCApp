import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type SnackbarType = 'success' | 'error' | 'info';

export interface SnackbarData {
  message: string;
  type: SnackbarType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

const DEFAULT_DURATION_MS = 4000;

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private readonly data$ = new BehaviorSubject<SnackbarData | null>(null);

  show(
    message: string,
    type: SnackbarType = 'info',
    duration: number = DEFAULT_DURATION_MS,
    actionLabel?: string,
    onAction?: () => void
  ): void {
    const data: SnackbarData = { message, type, duration };
    if (actionLabel) {
      data.actionLabel = actionLabel;
      data.onAction = onAction;
    }
    this.data$.next(data);
  }

  dismiss(): void {
    this.data$.next(null);
  }

  getData(): Observable<SnackbarData | null> {
    return this.data$.asObservable();
  }
}
