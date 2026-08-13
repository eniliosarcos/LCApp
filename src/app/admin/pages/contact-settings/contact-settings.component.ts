import { Component, OnInit } from '@angular/core';
import { ContactConfig } from '../../../core/models/contact.model';
import { ContactService } from '../../../core/services/contact.service';

@Component({
  selector: 'app-contact-settings',
  templateUrl: './contact-settings.component.html',
  styleUrls: ['./contact-settings.component.scss']
})
export class ContactSettingsComponent implements OnInit {
  form: ContactConfig = { whatsapp: '', whatsappDisplay: '', instagram: '', telegram: '' };
  loading = true;
  saving = false;
  saved = false;
  errorMessage = '';

  constructor(private readonly contactService: ContactService) {}

  ngOnInit(): void {
    this.contactService.getContact().subscribe({
      next: config => {
        this.form = { ...config };
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'No se pudieron cargar los datos de contacto.';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    this.saving = true;
    this.saved = false;
    this.errorMessage = '';
    this.contactService.updateContact(this.form).subscribe({
      next: () => {
        this.saved = true;
        this.saving = false;
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.saving = false;
      }
    });
  }
}
