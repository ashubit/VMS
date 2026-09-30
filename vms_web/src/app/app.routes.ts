import { Routes } from '@angular/router';
import { authGuard, guestGuard, permissionGuard, tenantModuleGuard } from './core/auth.guard';
import { AppShellComponent } from './layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login.page').then(m => m.LoginPageComponent),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        canActivate: [tenantModuleGuard('DASHBOARD')],
        loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPageComponent),
      },
      {
        path: 'visits',
        canActivate: [tenantModuleGuard('VISITS')],
        loadComponent: () => import('./features/visits/visits.page').then(m => m.VisitsPageComponent),
      },
      {
        path: 'scan',
        canActivate: [tenantModuleGuard('SCANNER'), permissionGuard('PASS_VERIFY')],
        loadComponent: () => import('./features/scanner/scanner.page').then(m => m.ScannerPageComponent),
      },
      {
        path: 'passes',
        canActivate: [tenantModuleGuard('QR_PASSES'), permissionGuard('PASS_VERIFY')],
        loadComponent: () => import('./features/passes/passes.page').then(m => m.PassesPageComponent),
      },
      {
        path: 'tenants',
        canActivate: [permissionGuard('TENANT_MANAGE')],
        loadComponent: () => import('./features/tenants/tenants.page').then(m => m.TenantsPageComponent),
      },
      {
        path: 'users',
        canActivate: [tenantModuleGuard('USERS'), permissionGuard('USER_MANAGE')],
        loadComponent: () => import('./features/users/users.page').then(m => m.UsersPageComponent),
      },
      {
        path: 'kiosks',
        canActivate: [tenantModuleGuard('KIOSKS'), permissionGuard('KIOSK_MANAGE')],
        loadComponent: () => import('./features/kiosks/kiosks.page').then(m => m.KiosksPageComponent),
      },
      {
        path: 'settings',
        canActivate: [tenantModuleGuard('SETTINGS'), permissionGuard('SETTINGS_MANAGE')],
        loadComponent: () => import('./features/settings/settings.page').then(m => m.SettingsPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
