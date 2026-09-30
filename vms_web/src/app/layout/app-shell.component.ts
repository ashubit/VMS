import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Permission, Role, TenantModule } from '../core/models';

interface NavItem {
  label: string;
  path: string;
  roles?: Role[];
  permission?: Permission;
  tenantModule?: TenantModule;
}

@Component({
  selector: 'app-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-frame">
      <aside class="sidebar">
        <a class="brand" routerLink="/dashboard" aria-label="VMS dashboard">
          <span class="brand-mark">V</span>
          <span>
            <strong>VMS</strong>
            <small>Visitor Management</small>
          </span>
        </a>

        <nav class="nav-list" aria-label="Primary navigation">
          @for (item of visibleNav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">
              <span class="nav-icon" aria-hidden="true">{{ item.label.charAt(0) }}</span>
              <span>{{ item.label }}</span>
            </a>
          }
        </nav>
      </aside>

      <main class="workspace">
        <header class="topbar">
          <div>
            <p class="eyebrow">{{ auth.user()?.role?.replace('_', ' ') }}</p>
            <h1>{{ title() }}</h1>
          </div>
          <div class="user-menu">
            <span>{{ auth.user()?.name }}</span>
            <button type="button" class="ghost" (click)="logout()">Sign out</button>
          </div>
        </header>
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly title = signal('Dashboard');

  private readonly nav: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', tenantModule: 'DASHBOARD' },
    { label: 'Visits', path: '/visits', tenantModule: 'VISITS' },
    { label: 'QR Passes', path: '/passes', permission: 'PASS_VERIFY', tenantModule: 'QR_PASSES' },
    { label: 'Scanner', path: '/scan', permission: 'PASS_VERIFY', tenantModule: 'SCANNER' },
    { label: 'Tenants', path: '/tenants', permission: 'TENANT_MANAGE' },
    { label: 'Users', path: '/users', permission: 'USER_MANAGE', tenantModule: 'USERS' },
    { label: 'Kiosks', path: '/kiosks', permission: 'KIOSK_MANAGE', tenantModule: 'KIOSKS' },
    { label: 'Settings', path: '/settings', permission: 'SETTINGS_MANAGE', tenantModule: 'SETTINGS' },
  ];

  readonly visibleNav = computed(() => {
    const user = this.auth.user();
    if (!user) return [];
    return this.nav.filter(item => (
      (!item.roles || item.roles.includes(user.role)) &&
      (!item.permission || user.permissions.includes(item.permission)) &&
      (user.role === 'GLOBAL_ADMIN' || !item.tenantModule || user.tenantModules.includes(item.tenantModule))
    ));
  });

  constructor() {
    this.updateTitle();
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.updateTitle());
  }

  logout(): void {
    this.auth.logout().subscribe(() => this.router.navigateByUrl('/login'));
  }

  private updateTitle(): void {
    const path = this.router.url.split('/')[1] || 'dashboard';
    this.title.set(path.charAt(0).toUpperCase() + path.slice(1));
  }
}
