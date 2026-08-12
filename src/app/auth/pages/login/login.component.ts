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
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl),
        error: (err: Error) => (this.errorMessage = err.message),
        complete: () => (this.loading = false)
      });
  }

  private get returnUrl(): string {
    return this.router.parseUrl(this.router.url).queryParamMap.get('returnUrl') || '/admin';
  }
}
