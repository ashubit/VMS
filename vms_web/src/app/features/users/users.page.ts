import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiError, Permission, Role, Tenant, User } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-users-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-grid">
      <section class="panel span-2">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Directory</p>
            <h2>User administration</h2>
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
                <th>Email</th>
                <th>Role</th>
                <th>Tenant</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td><strong>{{ user.name }}</strong></td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.role.replace('_', ' ') }}</td>
                  <td>{{ tenantName(user.tenantId) }}</td>
                  <td>{{ user.active ? 'Active' : 'Inactive' }}</td>
                  <td><button type="button" class="ghost" (click)="edit(user)">Edit</button></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="empty">No users found.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <aside class="panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">{{ editing() ? 'Edit' : 'Invite' }}</p>
            <h2>User</h2>
          </div>
        </div>
        <form class="form-stack" [formGroup]="form" (ngSubmit)="save()">
          <label>
            <span>Name</span>
            <input formControlName="name" />
          </label>
          @if (!editing()) {
            <label>
              <span>Email</span>
              <input type="email" formControlName="email" />
            </label>
            <label>
              <span>Password</span>
              <input type="password" formControlName="password" />
            </label>
          }
          <label>
            <span>Role</span>
            <select formControlName="role">
              @for (role of availableRoles(); track role) {
                <option [value]="role">{{ role.replace('_', ' ') }}</option>
              }
            </select>
          </label>
          @if (auth.user()?.role === 'GLOBAL_ADMIN') {
            <label>
              <span>Tenant</span>
              <select formControlName="tenantId">
                <option value="">Global account</option>
                @for (tenant of tenants(); track tenant.id) {
                  <option [value]="tenant.id">{{ tenant.name }}</option>
                }
              </select>
            </label>
          }
          @if (editing()) {
            <label class="checkbox">
              <input type="checkbox" formControlName="active" />
              <span>Active user</span>
            </label>
          }

          <section class="permission-grid">
            <div>
              <h3>Extra access</h3>
              @for (permission of manageablePermissions; track permission) {
                <label class="checkbox permission-option">
                  <input type="checkbox" [checked]="hasGrant(permission)" (change)="togglePermission('grant', permission)" />
                  <span>{{ permissionLabel(permission) }}</span>
                </label>
              }
            </div>
            <div>
              <h3>Blocked access</h3>
              @for (permission of manageablePermissions; track permission) {
                <label class="checkbox permission-option">
                  <input type="checkbox" [checked]="hasRevoke(permission)" (change)="togglePermission('revoke', permission)" />
                  <span>{{ permissionLabel(permission) }}</span>
                </label>
              }
            </div>
          </section>

          <button type="submit" class="primary" [disabled]="form.invalid">{{ editing() ? 'Save changes' : 'Create user' }}</button>
          @if (editing()) {
            <button type="button" class="ghost" (click)="cancel()">Cancel edit</button>
          }
        </form>
      </aside>
    </section>
  `,
})
export class UsersPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly users = signal<User[]>([]);
  readonly tenants = signal<Tenant[]>([]);
  readonly editing = signal<User | null>(null);
  readonly error = signal('');
  readonly grantOverrides = signal<Permission[]>([]);
  readonly revokeOverrides = signal<Permission[]>([]);
  readonly manageablePermissions: Permission[] = [
    'VISIT_CREATE',
    'VISIT_RECEIVE',
    'VISIT_CANCEL',
    'PASS_ISSUE',
    'PASS_VERIFY',
    'PASS_DISABLE',
    'USER_MANAGE',
    'KIOSK_MANAGE',
    'SETTINGS_MANAGE',
    'TENANT_MANAGE',
  ];

  readonly availableRoles = computed<Role[]>(() => (
    this.auth.user()?.role === 'GLOBAL_ADMIN'
      ? ['GLOBAL_ADMIN', 'TENANT_ADMIN', 'RECEPTIONIST', 'HOST']
      : ['TENANT_ADMIN', 'RECEPTIONIST', 'HOST']
  ));

  readonly form = this.fb.nonNullable.group({
    tenantId: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', Validators.email],
    password: [''],
    role: ['HOST' as Role, Validators.required],
    active: [true],
  });

  constructor() {
    this.load();
  }

  load(): void {
    const tenants$ = this.auth.user()?.role === 'GLOBAL_ADMIN' ? this.data.tenants() : of({ tenants: [] });
    forkJoin({ users: this.data.users(), tenants: tenants$ }).subscribe({
      next: ({ users, tenants }) => {
        this.users.set(users.users);
        this.tenants.set(tenants.tenants);
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load users'),
    });
  }

  tenantName(tenantId: string | null): string {
    if (!tenantId) return 'Global';
    return this.tenants().find(tenant => tenant.id === tenantId)?.name || tenantId;
  }

  edit(user: User): void {
    this.editing.set(user);
    this.form.patchValue({
      tenantId: user.tenantId || '',
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      active: user.active,
    });
    this.grantOverrides.set(user.permissionOverrides?.grant || []);
    this.revokeOverrides.set(user.permissionOverrides?.revoke || []);
  }

  cancel(): void {
    this.editing.set(null);
    this.grantOverrides.set([]);
    this.revokeOverrides.set([]);
    this.form.reset({ tenantId: '', name: '', email: '', password: '', role: 'HOST', active: true });
  }

  save(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const target = this.editing();

    if (!target && (!value.email || value.password.length < 12)) {
      this.error.set('Email and a 12 character password are required for new users.');
      return;
    }

    const request$: Observable<unknown> = target
      ? this.data.updateUser(target.id, { tenantId: value.tenantId || null, name: value.name, role: value.role, active: value.active, permissionOverrides: this.permissionOverrides() })
      : this.data.createUser({
          tenantId: value.tenantId || undefined,
          name: value.name,
          email: value.email,
          password: value.password,
          role: value.role,
          permissionOverrides: this.permissionOverrides(),
        });

    request$.subscribe({
      next: () => {
        this.cancel();
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to save user'),
    });
  }

  hasGrant(permission: Permission): boolean {
    return this.grantOverrides().includes(permission);
  }

  hasRevoke(permission: Permission): boolean {
    return this.revokeOverrides().includes(permission);
  }

  togglePermission(type: 'grant' | 'revoke', permission: Permission): void {
    const source = type === 'grant' ? this.grantOverrides : this.revokeOverrides;
    const other = type === 'grant' ? this.revokeOverrides : this.grantOverrides;
    const values = new Set(source());
    values.has(permission) ? values.delete(permission) : values.add(permission);
    source.set([...values]);
    other.set(other().filter(value => value !== permission));
  }

  permissionLabel(permission: Permission): string {
    return permission.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }

  private permissionOverrides(): { grant: Permission[]; revoke: Permission[] } {
    return {
      grant: this.grantOverrides(),
      revoke: this.revokeOverrides(),
    };
  }
}
