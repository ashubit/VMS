import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ApiError, Dashboard } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule],
  template: `
    <section class="page-stack">
      @if (error()) {
        <p class="alert">{{ error() }}</p>
      }

      <div class="metric-grid">
        @for (metric of metrics(); track metric.label) {
          <article class="metric-card">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </article>
        }
      </div>

      <section class="panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Audit</p>
            <h2>Recent activity</h2>
          </div>
          <button type="button" class="ghost" (click)="load()">Refresh</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Tenant</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              @for (event of dashboard()?.recentAudit || []; track event.id) {
                <tr>
                  <td>{{ event.action.replaceAll('_', ' ') }}</td>
                  <td>{{ event.tenantId || 'Global' }}</td>
                  <td>{{ event.createdAt | date:'medium' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="empty">No audit entries yet.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly data = inject(VmsDataService);

  readonly dashboard = signal<Dashboard | null>(null);
  readonly error = signal('');

  readonly metrics = signal([
    { label: 'Expected', value: 0 },
    { label: 'Arrived', value: 0 },
    { label: 'Checked out', value: 0 },
    { label: 'Today', value: 0 },
    { label: 'Tenants', value: 0 },
    { label: 'Active users', value: 0 },
  ]);

  constructor() {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.data.dashboard().subscribe({
      next: dashboard => {
        this.dashboard.set(dashboard);
        this.metrics.set([
          { label: 'Expected', value: dashboard.summary.expected },
          { label: 'Arrived', value: dashboard.summary.arrived },
          { label: 'Checked out', value: dashboard.summary.checkedOut },
          { label: 'Today', value: dashboard.summary.today },
          { label: 'Tenants', value: dashboard.summary.tenants },
          { label: 'Active users', value: dashboard.summary.activeUsers },
        ]);
      },
      error: (error: ApiError) => this.error.set(error.error || 'Unable to load dashboard'),
    });
  }
}
