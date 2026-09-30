import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiError, Tenant, TenantModule } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-tenants-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-grid">
      <section class="panel span-2">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Companies</p>
            <h2>Tenant directory</h2>
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
                <th>Contact</th>
                <th>Modules</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (tenant of tenants(); track tenant.id) {
                <tr>
                  <td><strong>{{ tenant.name }}</strong></td>
                  <td>{{ tenant.floor || '-' }} {{ tenant.suite || '' }}</td>
                  <td>{{ tenant.contactEmail || '-' }}</td>
                  <td>{{ moduleSummary(tenant.allowedModules) }}</td>
                  <td>{{ tenant.active ? 'Active' : 'Inactive' }}</td>
                  <td><button type="button" class="ghost" (click)="edit(tenant)">Edit</button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No tenants created.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">{{ editing() ? 'Edit' : 'Create' }}</p>
            <h2>Tenant</h2>
          </div>
        </div>
        <form class="form-stack" [formGroup]="form" (ngSubmit)="save()">
          <label>
            <span>Name</span>
            <input formControlName="name" />
          </label>
          <label>
            <span>Suite</span>
            <input formControlName="suite" />
          </label>
          <label>
            <span>Floor</span>
            <input formControlName="floor" />
          </label>
          <label>
            <span>Contact email</span>
            <input type="email" formControlName="contactEmail" />
          </label>
          <label class="checkbox">
            <input type="checkbox" formControlName="active" />
            <span>Active tenant</span>
          </label>
          <section class="permission-grid">
            <div class="full">
              <h3>Allowed modules</h3>
              @for (module of tenantModules; track module) {
                <label class="checkbox permission-option">
                  <input type="checkbox" [checked]="hasModule(module)" (change)="toggleModule(module)" />
                  <span>{{ moduleLabel(module) }}</span>
                </label>
              }
            </div>
          </section>
          <button type="submit" class="primary" [disabled]="form.invalid">{{ editing() ? 'Save changes' : 'Create tenant' }}</button>
          @if (editing()) {
            <button type="button" class="ghost" (click)="cancel()">Cancel edit</button>
          }
        </form>
      </aside>
    </section>
  `,
})
export class TenantsPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);

  readonly tenants = signal<Tenant[]>([]);
  readonly editing = signal<Tenant | null>(null);
  readonly error = signal('');
  readonly selectedModules = signal<TenantModule[]>([]);
  readonly tenantModules: TenantModule[] = ['DASHBOARD', 'VISITS', 'QR_PASSES', 'SCANNER', 'USERS', 'KIOSKS', 'SETTINGS'];

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    suite: [''],
    floor: [''],
    contactEmail: [''],
    active: [true],
  });

  constructor() {
    this.selectedModules.set([...this.tenantModules]);
    this.load();
  }

  load(): void {
    this.data.tenants().subscribe({
      next: response => this.tenants.set(response.tenants),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load tenants'),
    });
  }

  edit(tenant: Tenant): void {
    this.editing.set(tenant);
    this.form.setValue({
      name: tenant.name,
      suite: tenant.suite,
      floor: tenant.floor,
      contactEmail: tenant.contactEmail,
      active: tenant.active,
    });
    this.selectedModules.set(tenant.allowedModules || this.tenantModules);
  }

  cancel(): void {
    this.editing.set(null);
    this.selectedModules.set([...this.tenantModules]);
    this.form.reset({ name: '', suite: '', floor: '', contactEmail: '', active: true });
  }

  save(): void {
    if (this.form.invalid) return;
    const payload = { ...this.form.getRawValue(), allowedModules: this.selectedModules() };
    const request$: Observable<unknown> = this.editing()
      ? this.data.updateTenant(this.editing()!.id, payload)
      : this.data.createTenant(payload);

    request$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to save tenant'),
    });
  }

  hasModule(module: TenantModule): boolean {
    return this.selectedModules().includes(module);
  }

  toggleModule(module: TenantModule): void {
    const modules = new Set(this.selectedModules());
    modules.has(module) ? modules.delete(module) : modules.add(module);
    this.selectedModules.set([...modules]);
  }

  moduleLabel(module: TenantModule): string {
    return module.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }

  moduleSummary(modules: TenantModule[]): string {
    if (!modules?.length) return 'None';
    if (modules.length === this.tenantModules.length) return 'All modules';
    return modules.map(module => this.moduleLabel(module)).join(', ');
  }
}
