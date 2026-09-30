import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Dashboard,
  Kiosk,
  PassVerification,
  Permission,
  QrPass,
  SecurityPolicy,
  Tenant,
  TenantConfig,
  User,
  Visit,
  VisitPass,
  VisitStatus,
} from './models';

@Injectable({ providedIn: 'root' })
export class VmsDataService {
  private readonly api = inject(ApiService);

  dashboard(): Observable<Dashboard> {
    return this.api.get<Dashboard>('/analytics');
  }

  visits(): Observable<{ visits: Visit[] }> {
    return this.api.get<{ visits: Visit[] }>('/visits');
  }

  createVisit(payload: {
    visitorName: string;
    visitorEmail?: string;
    purpose: string;
    expectedAt: string;
    hostId?: string;
    ndaAccepted: boolean;
  }): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/visits', payload);
  }

  updateVisitStatus(id: string, status: Extract<VisitStatus, 'ARRIVED' | 'CHECKED_OUT' | 'CANCELLED'>): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>(`/visits/${id}/status`, { status });
  }

  issueVisitPass(id: string): Observable<VisitPass> {
    return this.api.post<VisitPass>(`/visits/${id}/pass`, {});
  }

  verifyVisitPass(token: string): Observable<PassVerification> {
    return this.api.post<PassVerification>('/passes/verify', { token });
  }

  qrPasses(): Observable<{ passes: QrPass[] }> {
    return this.api.get<{ passes: QrPass[] }>('/passes');
  }

  disableQrPass(id: string, reason: string): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>(`/passes/${id}/disable`, { reason });
  }

  tenants(): Observable<{ tenants: Tenant[] }> {
    return this.api.get<{ tenants: Tenant[] }>('/tenants');
  }

  createTenant(payload: Omit<Tenant, 'id'>): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/tenants', payload);
  }

  updateTenant(id: string, payload: Partial<Omit<Tenant, 'id'>>): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>(`/tenants/${id}`, payload);
  }

  users(): Observable<{ users: User[] }> {
    return this.api.get<{ users: User[] }>('/users');
  }

  createUser(payload: {
    tenantId?: string;
    name: string;
    email: string;
    password: string;
    role: User['role'];
    permissionOverrides?: { grant: Permission[]; revoke: Permission[] };
  }): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/users', payload);
  }

  updateUser(id: string, payload: Partial<Pick<User, 'tenantId' | 'name' | 'role' | 'active' | 'permissionOverrides'>>): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>(`/users/${id}`, payload);
  }

  kiosks(): Observable<{ kiosks: Kiosk[] }> {
    return this.api.get<{ kiosks: Kiosk[] }>('/kiosks');
  }

  createKiosk(payload: Omit<Kiosk, 'id'>): Observable<{ id: string }> {
    return this.api.post<{ id: string }>('/kiosks', payload);
  }

  updateKiosk(id: string, payload: Partial<Omit<Kiosk, 'id'>>): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>(`/kiosks/${id}`, payload);
  }

  securityPolicy(): Observable<{ policy: SecurityPolicy }> {
    return this.api.get<{ policy: SecurityPolicy }>('/settings/security');
  }

  updateSecurityPolicy(policy: SecurityPolicy): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>('/settings/security', policy);
  }

  tenantConfig(): Observable<{ config: TenantConfig }> {
    return this.api.get<{ config: TenantConfig }>('/settings/tenant');
  }

  updateTenantConfig(config: TenantConfig): Observable<{ ok: true }> {
    return this.api.patch<{ ok: true }>('/settings/tenant', config);
  }
}
