import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import QRCode from 'qrcode';
import { AuthService } from '../../core/auth.service';
import { ApiError, User, Visit, VisitPass } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-visits-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-grid">
      <section class="panel span-2">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Visitors</p>
            <h2>Visit schedule</h2>
          </div>
          <button type="button" class="ghost" (click)="load()">Refresh</button>
        </div>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        <div class="filter-row">
          @for (status of statuses; track status) {
            <button type="button" [class.active]="filter() === status" class="chip" (click)="filter.set(status)">
              {{ status === 'ALL' ? 'All' : status.replaceAll('_', ' ') }}
            </button>
          }
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Purpose</th>
                <th>Expected</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (visit of filteredVisits(); track visit.id) {
                <tr>
                  <td>
                    <strong>{{ visit.visitorName }}</strong>
                    <small>{{ visit.visitorEmail || 'No email' }}</small>
                  </td>
                  <td>{{ visit.purpose }}</td>
                  <td>{{ visit.expectedAt | date:'medium' }}</td>
                  <td><span class="status" [attr.data-status]="visit.status">{{ visit.status.replaceAll('_', ' ') }}</span></td>
                  <td>
                    <div class="action-row">
                      @if (canReceive() && visit.status === 'EXPECTED') {
                        <button type="button" class="ghost" (click)="setStatus(visit, 'ARRIVED')">Check in</button>
                        <button type="button" class="ghost danger" (click)="setStatus(visit, 'CANCELLED')">Cancel</button>
                      }
                      @if (canIssuePass() && visit.status === 'EXPECTED') {
                        <button type="button" class="ghost" (click)="issuePass(visit)">QR</button>
                      }
                      @if (canReceive() && visit.status === 'ARRIVED') {
                        <button type="button" class="ghost" (click)="setStatus(visit, 'CHECKED_OUT')">Check out</button>
                      }
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty">No visits found.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      @if (canCreate()) {
        <aside class="panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">New visit</p>
              <h2>Pre-register guest</h2>
            </div>
          </div>

          <form class="form-stack" [formGroup]="form" (ngSubmit)="create()">
            <label>
              <span>Visitor name</span>
              <input formControlName="visitorName" />
            </label>
            <label>
              <span>Visitor email</span>
              <input type="email" formControlName="visitorEmail" />
            </label>
            <label>
              <span>Purpose</span>
              <textarea rows="3" formControlName="purpose"></textarea>
            </label>
            <label>
              <span>Expected at</span>
              <input type="datetime-local" formControlName="expectedAt" />
            </label>
            @if (auth.user()?.role === 'TENANT_ADMIN') {
              <label>
                <span>Host</span>
                <select formControlName="hostId">
                  <option value="">Use my account</option>
                  @for (host of hosts(); track host.id) {
                    <option [value]="host.id">{{ host.name }} - {{ host.role.replace('_', ' ') }}</option>
                  }
                </select>
              </label>
            }
            <label class="checkbox">
              <input type="checkbox" formControlName="ndaAccepted" />
              <span>NDA accepted</span>
            </label>
            <button type="submit" class="primary" [disabled]="form.invalid">Create visit</button>
          </form>
        </aside>
      }

      @if (passPreview()) {
        <aside class="panel pass-panel">
          <div class="section-heading compact">
            <div>
              <p class="eyebrow">Secure pass</p>
              <h2>{{ passPreview()!.visit.visitorName }}</h2>
            </div>
            <button type="button" class="ghost" (click)="closePass()">Close</button>
          </div>
          <img class="qr-code" [src]="passPreview()!.qrDataUrl" alt="Visitor pass QR code" />
          <dl class="detail-list">
            <div>
              <dt>Tenant ID</dt>
              <dd>{{ passPreview()!.pass.tenantId }}</dd>
            </div>
            <div>
              <dt>Visitor</dt>
              <dd>{{ passPreview()!.pass.visitorName }} {{ passPreview()!.pass.visitorEmail ? '(' + passPreview()!.pass.visitorEmail + ')' : '' }}</dd>
            </div>
            <div>
              <dt>Visit purpose</dt>
              <dd>{{ passPreview()!.pass.purpose }}</dd>
            </div>
            <div>
              <dt>QR issued by</dt>
              <dd>{{ passPreview()!.pass.issuedBy.name }} - {{ passPreview()!.pass.issuedBy.role.replace('_', ' ') }}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{{ passPreview()!.pass.expiresAt | date:'medium' }}</dd>
            </div>
            <div>
              <dt>Token</dt>
              <dd class="token">{{ passPreview()!.pass.token }}</dd>
            </div>
          </dl>
        </aside>
      }
    </section>
  `,
})
export class VisitsPageComponent {
  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly statuses = ['ALL', 'EXPECTED', 'ARRIVED', 'CHECKED_OUT', 'CANCELLED'] as const;
  readonly visits = signal<Visit[]>([]);
  readonly hosts = signal<User[]>([]);
  readonly filter = signal<typeof this.statuses[number]>('ALL');
  readonly error = signal('');
  readonly passPreview = signal<{ visit: Visit; pass: VisitPass; qrDataUrl: string } | null>(null);

  readonly canCreate = computed(() => this.auth.hasPermission('VISIT_CREATE') && Boolean(this.auth.user()?.tenantId));
  readonly canReceive = computed(() => this.auth.hasPermission('VISIT_RECEIVE'));
  readonly canIssuePass = computed(() => this.auth.hasPermission('PASS_ISSUE'));
  readonly filteredVisits = computed(() => {
    const filter = this.filter();
    return filter === 'ALL' ? this.visits() : this.visits().filter(visit => visit.status === filter);
  });

  readonly form = this.fb.nonNullable.group({
    visitorName: ['', [Validators.required, Validators.minLength(2)]],
    visitorEmail: [''],
    purpose: ['', [Validators.required, Validators.minLength(2)]],
    expectedAt: ['', Validators.required],
    hostId: [''],
    ndaAccepted: [false],
  });

  constructor() {
    this.load();
  }

  load(): void {
    const users$ = this.auth.user()?.role === 'TENANT_ADMIN' ? this.data.users() : of({ users: [] });
    forkJoin({ visits: this.data.visits(), users: users$ }).subscribe({
      next: ({ visits, users }) => {
        this.visits.set(visits.visits);
        this.hosts.set(users.users.filter(user => ['HOST', 'TENANT_ADMIN'].includes(user.role) && user.active));
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load visits'),
    });
  }

  create(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.data.createVisit({
      visitorName: value.visitorName,
      visitorEmail: value.visitorEmail,
      purpose: value.purpose,
      expectedAt: new Date(value.expectedAt).toISOString(),
      hostId: value.hostId || undefined,
      ndaAccepted: value.ndaAccepted,
    }).subscribe({
      next: () => {
        this.form.reset({ visitorName: '', visitorEmail: '', purpose: '', expectedAt: '', hostId: '', ndaAccepted: false });
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to create visit'),
    });
  }

  setStatus(visit: Visit, status: 'ARRIVED' | 'CHECKED_OUT' | 'CANCELLED'): void {
    this.data.updateVisitStatus(visit.id, status).subscribe({
      next: () => this.load(),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to update visit'),
    });
  }

  issuePass(visit: Visit): void {
    this.error.set('');
    this.data.issueVisitPass(visit.id).subscribe({
      next: pass => {
        QRCode.toDataURL(pass.passUrl, { width: 260, margin: 2, errorCorrectionLevel: 'M' })
          .then(qrDataUrl => this.passPreview.set({ visit, pass, qrDataUrl }))
          .catch(() => this.passPreview.set({ visit, pass, qrDataUrl: '' }));
        this.load();
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to issue pass'),
    });
  }

  closePass(): void {
    this.passPreview.set(null);
  }
}
