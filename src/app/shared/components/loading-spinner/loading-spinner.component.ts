import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type LoadingSpinnerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-loading-spinner',
  templateUrl: './loading-spinner.component.html',
  styleUrls: ['./loading-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppLoadingSpinnerComponent {
  @Input() label = '';
  @Input() size: LoadingSpinnerSize = 'md';
}
