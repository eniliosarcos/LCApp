import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { ContactConfig } from './core/models/contact.model';
import { ContactService } from './core/services/contact.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'catalog';
  year = new Date().getFullYear();
  contact: ContactConfig | null = null;
  isAdminRoute = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly router: Router,
    private readonly contactService: ContactService
  ) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.contact = config;
    });

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

  getWhatsAppHref(): string {
    if (!this.contact) {
      return '#';
    }
    return `https://wa.me/${this.contact.whatsapp}`;
  }

  getInstagramHref(): string {
    if (!this.contact) {
      return '#';
    }
    return `https://instagram.com/${this.contact.instagram.replace('@', '')}`;
  }

  getTelegramHref(): string {
    if (!this.contact) {
      return '#';
    }
    return `https://t.me/${this.contact.telegram.replace('@', '')}`;
  }
}
