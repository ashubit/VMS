import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { Permission, Role, TenantModule } from './models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadSession().pipe(map(user => user ? true : router.createUrlTree(['/login'])));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadSession().pipe(map(user => user ? router.createUrlTree(['/dashboard']) : true));
};

export const roleGuard = (roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadSession().pipe(
    map(user => user && roles.includes(user.role) ? true : router.createUrlTree(['/dashboard'])),
  );
};

export const permissionGuard = (permission: Permission): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadSession().pipe(
    map(user => user?.permissions.includes(permission) ? true : router.createUrlTree(['/dashboard'])),
  );
};

export const tenantModuleGuard = (module: TenantModule): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.loadSession().pipe(
    map(user => user && (user.role === 'GLOBAL_ADMIN' || user.tenantModules.includes(module)) ? true : router.createUrlTree(['/dashboard'])),
  );
};
