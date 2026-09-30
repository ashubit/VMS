import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Permission, Role, TenantModule, User } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private sessionChecked = false;

  readonly user = signal<User | null>(null);
  readonly authenticated = computed(() => Boolean(this.user()));

  loadSession(): Observable<User | null> {
    if (this.sessionChecked) return of(this.user());
    return this.api.get<{ user: User }>('/auth/me').pipe(
      map(response => response.user),
      tap(user => {
        this.sessionChecked = true;
        this.user.set(user);
      }),
      catchError(() => {
        this.sessionChecked = true;
        this.user.set(null);
        return of(null);
      }),
    );
  }

  login(email: string, password: string): Observable<User> {
    return this.api.post<{ user: User }>('/auth/login', { email, password }).pipe(
      map(response => response.user),
      tap(user => {
        this.sessionChecked = true;
        this.user.set(user);
      }),
    );
  }

  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout', {}).pipe(
      tap(() => {
        this.sessionChecked = true;
        this.user.set(null);
      }),
      catchError(() => {
        this.sessionChecked = true;
        this.user.set(null);
        return of(undefined);
      }),
    );
  }

  hasAnyRole(roles: Role[]): boolean {
    const current = this.user();
    return Boolean(current && roles.includes(current.role));
  }

  hasPermission(permission: Permission): boolean {
    return Boolean(this.user()?.permissions.includes(permission));
  }

  hasTenantModule(module: TenantModule): boolean {
    const current = this.user();
    return Boolean(current && (current.role === 'GLOBAL_ADMIN' || current.tenantModules.includes(module)));
  }
}
