import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;

  constructor(private readonly authService: AuthService, private readonly router: Router) {}

  onSubmit(): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService
      .login(this.username, this.password)
      .then(() => this.router.navigateByUrl(this.returnUrl))
      .catch(() => (this.errorMessage = 'Usuario o contraseña incorrectos.'))
      .finally(() => (this.loading = false));
  }

  private get returnUrl(): string {
    return this.router.parseUrl(this.router.url).queryParamMap.get('returnUrl') || '/admin';
  }
}
