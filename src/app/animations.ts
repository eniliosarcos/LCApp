import { trigger, transition, style, animate, query } from '@angular/animations';

export const routeFade = trigger('routeAnimations', [
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0 }),
      animate('200ms ease-out', style({ opacity: 1 }))
    ], { optional: true })
  ])
]);
