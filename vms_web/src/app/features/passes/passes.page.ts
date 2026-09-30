import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ApiError, QrPass } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-passes-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-stack">
      <section class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">QR module</p>
            <h2>Issued QR passes</h2>
          </div>
          <button type="button" class="ghost" (click)="load()">Refresh</button>
        </div>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        <form class="scan-form" [formGroup]="disableForm" (ngSubmit)="disableSelected()">
          <label>
            <span>Disable reason</span>
            <input formControlName="reason" />
          </label>
          <button type="submit" class="primary" [disabled]="!selectedPass() || !auth.hasPermission('PASS_DISABLE')">Disable selected QR</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Visitor</th>
                <th>Purpose</th>
                <th>Tenant</th>
                <th>Issued by</th>
                <th>Issued</th>
                <th>Expires</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              @for (pass of passes(); track pass.id) {
                <tr [class.selected-row]="selectedPass()?.id === pass.id">
                  <td>
                    <input type="radio" name="selectedPass" [checked]="selectedPass()?.id === pass.id" (change)="select(pass)" />
                  </td>
                  <td>
                    <strong>{{ pass.visitorName }}</strong>
                    <small>{{ pass.visitorEmail || 'No email' }}</small>
                  </td>
                  <td>{{ pass.purpose }}</td>
                  <td><span class="token">{{ pass.tenantId }}</span></td>
                  <td>
                    {{ pass.issuedBy.name }}
                    <small>{{ pass.issuedBy.role.replace('_', ' ') }}</small>
                  </td>
                  <td>{{ pass.issuedAt | date:'medium' }}</td>
                  <td>{{ pass.expiresAt | date:'medium' }}</td>
                  <td>
                    <span class="status" [attr.data-status]="pass.disabled ? 'CANCELLED' : 'EXPECTED'">
                      {{ pass.disabled ? 'Disabled' : 'Active' }}
                    </span>
                    @if (pass.disabledReason) {
                      <small>{{ pass.disabledReason }}</small>
                    }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="empty">No QR passes issued yet.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
})
export class PassesPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly passes = signal<QrPass[]>([]);
  readonly selectedPass = signal<QrPass | null>(null);
  readonly error = signal('');

  readonly disableForm = this.fb.nonNullable.group({
    reason: [''],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.data.qrPasses().subscribe({
      next: response => this.passes.set(response.passes),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load QR passes'),
    });
  }

  select(pass: QrPass): void {
    this.selectedPass.set(pass);
    this.disableForm.controls.reason.setValue(pass.disabledReason || '');
  }

  disableSelected(): void {
    const pass = this.selectedPass();
    if (!pass) return;
    this.data.disableQrPass(pass.id, this.disableForm.controls.reason.value).subscribe({
      next: () => {
        this.selectedPass.set(null);
        this.disableForm.reset({ reason: '' });
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to disable QR pass'),
    });
  }
}
