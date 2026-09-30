import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ApiError } from '../../core/models';

@Component({
  selector: 'app-login-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="login-page">
      <section class="login-panel">
        <div class="login-copy">
          <span class="brand-mark large">V</span>
          <p class="eyebrow">Visitor Management System</p>
          <h1>Secure front desk operations</h1>
          <p>Sign in to manage visitor arrivals, host appointments, tenant users, kiosks, and policy settings.</p>
        </div>

        <form class="form-panel" [formGroup]="form" (ngSubmit)="submit()">
          <h2>Sign in</h2>
          <label>
            <span>Email</span>
            <input type="email" formControlName="email" autocomplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" formControlName="password" autocomplete="current-password" />
          </label>

          @if (error()) {
            <p class="alert">{{ error() }}</p>
          }

          <button type="submit" class="primary" [disabled]="form.invalid || submitting()">
            {{ submitting() ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>
      </section>
    </main>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set('');

    this.auth.login(this.form.controls.email.value, this.form.controls.password.value).subscribe({
      next: () => this.router.navigateByUrl('/dashboard'),
      error: (error: ApiError) => {
        this.error.set(error.error || 'Unable to sign in');
        this.submitting.set(false);
      },
    });
  }
}
