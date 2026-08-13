import { Component, OnInit } from '@angular/core';
import { ContactConfig } from './core/models/contact.model';
import { ContactService } from './core/services/contact.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'catalog';
  year = new Date().getFullYear();
  contact: ContactConfig | null = null;

  constructor(private readonly contactService: ContactService) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe(config => {
      this.contact = config;
    });
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
