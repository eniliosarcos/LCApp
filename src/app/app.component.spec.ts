import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';
import { ContactConfig } from './core/models/contact.model';
import { ContactService } from './core/services/contact.service';

const contactStub: ContactConfig = {
  whatsapp: '521234567890',
  whatsappDisplay: '+52 123 456 7890',
  instagram: '@tu_usuario',
  telegram: '@tu_usuario'
};

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, SharedModule],
      declarations: [AppComponent],
      providers: [{ provide: ContactService, useValue: { getContact: () => of(contactStub) } }]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'catalog'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('catalog');
  });
});
