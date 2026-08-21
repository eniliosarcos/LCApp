import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { routeFade } from './animations';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [routeFade]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'catalog';
  isAdminRoute = false;

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.isAdminRoute = this.router.url.startsWith('/admin');
      });
    this.isAdminRoute = this.router.url.startsWith('/admin');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRouteAnimationData(): string {
    return this.isAdminRoute ? 'admin' : 'client';
  }
}
