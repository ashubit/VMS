import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ApiError } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-settings-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-stack">
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }
      @if (saved()) {
        <p class="success">Settings saved.</p>
      }

      @if (auth.user()?.role === 'GLOBAL_ADMIN') {
        <section class="panel narrow">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Global</p>
              <h2>Security policy</h2>
            </div>
          </div>
          <form class="form-stack two-col" [formGroup]="securityForm" (ngSubmit)="saveSecurity()">
            <label class="checkbox">
              <input type="checkbox" formControlName="badgeRequired" />
              <span>Badge required</span>
            </label>
            <label class="checkbox">
              <input type="checkbox" formControlName="photoRequired" />
              <span>Photo required</span>
            </label>
            <label class="checkbox">
              <input type="checkbox" formControlName="escortRequired" />
              <span>Escort required</span>
            </label>
            <label>
              <span>Max session hours</span>
              <input type="number" min="1" max="24" formControlName="maxSessionHours" />
            </label>
            <label>
              <span>Retention days</span>
              <input type="number" min="1" max="3650" formControlName="retentionDays" />
            </label>
            <label class="full">
              <span>Emergency contact</span>
              <input formControlName="emergencyContact" />
            </label>
            <button type="submit" class="primary" [disabled]="securityForm.invalid">Save policy</button>
          </form>
        </section>
      }

      @if (auth.user()?.tenantId) {
        <section class="panel narrow">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Tenant</p>
              <h2>Check-in configuration</h2>
            </div>
          </div>
          <form class="form-stack" [formGroup]="tenantForm" (ngSubmit)="saveTenant()">
            <label>
              <span>NDA title</span>
              <input formControlName="ndaTitle" />
            </label>
            <label>
              <span>NDA text</span>
              <textarea rows="7" formControlName="ndaText"></textarea>
            </label>
            <label>
              <span>Check-in instructions</span>
              <textarea rows="4" formControlName="checkInInstructions"></textarea>
            </label>
            <label class="checkbox">
              <input type="checkbox" formControlName="notifyHosts" />
              <span>Notify hosts</span>
            </label>
            <button type="submit" class="primary" [disabled]="tenantForm.invalid">Save configuration</button>
          </form>
        </section>
      }
    </section>
  `,
})
export class SettingsPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly error = signal('');
  readonly saved = signal(false);

  readonly securityForm = this.fb.nonNullable.group({
    badgeRequired: [true],
    photoRequired: [false],
    escortRequired: [true],
    maxSessionHours: [8, [Validators.required, Validators.min(1), Validators.max(24)]],
    retentionDays: [365, [Validators.required, Validators.min(1), Validators.max(3650)]],
    emergencyContact: [''],
  });

  readonly tenantForm = this.fb.nonNullable.group({
    ndaTitle: ['', [Validators.required, Validators.minLength(2)]],
    ndaText: ['', [Validators.required, Validators.minLength(20)]],
    checkInInstructions: ['', [Validators.required, Validators.minLength(2)]],
    notifyHosts: [true],
  });

  constructor() {
    if (this.auth.user()?.role === 'GLOBAL_ADMIN') {
      this.data.securityPolicy().subscribe({
        next: response => this.securityForm.setValue(response.policy),
        error: (error: ApiError) => this.error.set(error.error || 'Unable to load security policy'),
      });
    }

    if (this.auth.user()?.tenantId) {
      this.data.tenantConfig().subscribe({
        next: response => this.tenantForm.setValue(response.config),
        error: (error: ApiError) => this.error.set(error.error || 'Unable to load tenant settings'),
      });
    }
  }

  saveSecurity(): void {
    if (this.securityForm.invalid) return;
    this.persist(this.data.updateSecurityPolicy(this.securityForm.getRawValue()));
  }

  saveTenant(): void {
    if (this.tenantForm.invalid) return;
    this.persist(this.data.updateTenantConfig(this.tenantForm.getRawValue()));
  }

  private persist(request$: ReturnType<VmsDataService['updateSecurityPolicy']>): void {
    this.error.set('');
    this.saved.set(false);
    request$.subscribe({
      next: () => this.saved.set(true),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to save settings'),
    });
  }
}
