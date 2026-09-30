import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiError, Kiosk, KioskMode, Tenant } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-kiosks-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-grid">
      <section class="panel span-2">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Devices</p>
            <h2>Kiosk configuration</h2>
          </div>
          <button type="button" class="ghost" (click)="load()">Refresh</button>
        </div>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Mode</th>
                <th>Tenant</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (kiosk of kiosks(); track kiosk.id) {
                <tr>
                  <td><strong>{{ kiosk.name }}</strong></td>
                  <td>{{ kiosk.location }}</td>
                  <td>{{ kiosk.mode.replace('_', ' ') }}</td>
                  <td>{{ tenantName(kiosk.tenantId) }}</td>
                  <td>{{ kiosk.active ? 'Active' : 'Inactive' }}</td>
                  <td><button type="button" class="ghost" (click)="edit(kiosk)">Edit</button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No kiosks configured.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">{{ editing() ? 'Edit' : 'Create' }}</p>
            <h2>Kiosk</h2>
          </div>
        </div>
        <form class="form-stack" [formGroup]="form" (ngSubmit)="save()">
          <label>
            <span>Name</span>
            <input formControlName="name" />
          </label>
          <label>
            <span>Location</span>
            <input formControlName="location" />
          </label>
          <label>
            <span>Mode</span>
            <select formControlName="mode">
              <option value="SHARED_LOBBY">Shared lobby</option>
              <option value="TENANT_SUITE">Tenant suite</option>
            </select>
          </label>
          @if (auth.user()?.role === 'GLOBAL_ADMIN') {
            <label>
              <span>Tenant</span>
              <select formControlName="tenantId">
                <option value="">No tenant</option>
                @for (tenant of tenants(); track tenant.id) {
                  <option [value]="tenant.id">{{ tenant.name }}</option>
                }
              </select>
            </label>
          }
          <label class="checkbox">
            <input type="checkbox" formControlName="active" />
            <span>Active kiosk</span>
          </label>
          <button type="submit" class="primary" [disabled]="form.invalid">{{ editing() ? 'Save changes' : 'Create kiosk' }}</button>
          @if (editing()) {
            <button type="button" class="ghost" (click)="cancel()">Cancel edit</button>
          }
        </form>
      </aside>
    </section>
  `,
})
export class KiosksPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly kiosks = signal<Kiosk[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly editing = signal<Kiosk | null>(null);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    tenantId: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    location: ['', [Validators.required, Validators.minLength(2)]],
    mode: ['SHARED_LOBBY' as KioskMode, Validators.required],
    active: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    const tenants$ = this.auth.user()?.role === 'GLOBAL_ADMIN' ? this.data.tenants() : of({ tenants: [] });
    forkJoin({ kiosks: this.data.kiosks(), tenants: tenants$ }).subscribe({
      next: ({ kiosks, tenants }) => {
        this.kiosks.set(kiosks.kiosks);
        this.tenants.set(tenants.tenants);
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load kiosks'),
    });
  }

  tenantName(tenantId: string | null): string {
    if (!tenantId) return 'Shared lobby';
    return this.tenants().find(tenant => tenant.id === tenantId)?.name || tenantId;
  }

  edit(kiosk: Kiosk): void {
    this.editing.set(kiosk);
    this.form.setValue({
      tenantId: kiosk.tenantId || '',
      name: kiosk.name,
      location: kiosk.location,
      mode: kiosk.mode,
      active: kiosk.active,
    });
  }

  cancel(): void {
    this.editing.set(null);
    this.form.reset({ tenantId: '', name: '', location: '', mode: 'SHARED_LOBBY', active: true });
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const payload = { ...value, tenantId: value.tenantId || null };
    const request$: Observable<unknown> = this.editing()
      ? this.data.updateKiosk(this.editing()!.id, payload)
      : this.data.createKiosk(payload);

    request$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to save kiosk'),
    });
  }
}
