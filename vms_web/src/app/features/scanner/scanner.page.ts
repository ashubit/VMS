import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiError, PassVerification } from '../../core/models';
import { VmsDataService } from '../../core/vms-data.service';

type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]> };
type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorInstance;

@Component({
  selector: 'app-scanner-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-grid scanner-layout">
      <section class="panel span-2">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Access control</p>
            <h2>QR verification desk</h2>
          </div>
          <button type="button" class="ghost" (click)="startCamera()" [disabled]="scanning()">Start camera</button>
        </div>

        @if (error()) {
          <p class="alert">{{ error() }}</p>
        }

        <div class="scanner-stage">
          <video #video playsinline muted></video>
          @if (!scanning()) {
            <div class="scanner-placeholder">
              <strong>Camera idle</strong>
              <span>Paste a token or start camera scanning.</span>
            </div>
          }
        </div>

        <form class="scan-form" [formGroup]="form" (ngSubmit)="verify()">
          <label>
            <span>Pass token</span>
            <input formControlName="token" autocomplete="off" />
          </label>
          <button type="submit" class="primary" [disabled]="form.invalid">Verify pass</button>
          @if (scanning()) {
            <button type="button" class="ghost" (click)="stopCamera()">Stop camera</button>
          }
        </form>
      </section>

      <aside class="panel decision-panel" [attr.data-decision]="result()?.decision || 'IDLE'">
        <div class="decision-mark">{{ result()?.decision || 'READY' }}</div>
        @if (result()) {
          <p>{{ result()!.reason }}</p>
          @if (result()!.pass) {
            <dl class="detail-list">
              <div>
                <dt>Tenant ID</dt>
                <dd>{{ result()!.pass!.tenantId }}</dd>
              </div>
              <div>
                <dt>QR issued by</dt>
                <dd>{{ result()!.pass!.issuedBy.name }} - {{ result()!.pass!.issuedBy.role.replace('_', ' ') }}</dd>
              </div>
              <div>
                <dt>QR issued at</dt>
                <dd>{{ result()!.pass!.issuedAt | date:'medium' }}</dd>
              </div>
              <div>
                <dt>QR expires</dt>
                <dd>{{ result()!.pass!.expiresAt | date:'medium' }}</dd>
              </div>
            </dl>
          }
          @if (result()!.visit) {
            <dl class="detail-list">
              <div>
                <dt>Visitor</dt>
                <dd>{{ result()!.visit!.visitorName }}</dd>
              </div>
              <div>
                <dt>Purpose</dt>
                <dd>{{ result()!.visit!.purpose }}</dd>
              </div>
              <div>
                <dt>Expected</dt>
                <dd>{{ result()!.visit!.expectedAt | date:'medium' }}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{{ result()!.visit!.status.replaceAll('_', ' ') }}</dd>
              </div>
            </dl>
            @if (result()!.decision === 'ALLOW') {
              <button type="button" class="primary" (click)="checkIn()">Approve check-in</button>
            }
          }
        } @else {
          <p>Verified results appear here for quick allow or deny decisions.</p>
        }
      </aside>
    </section>
  `,
})
export class ScannerPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  private readonly data = inject(VmsDataService);
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private stream?: MediaStream;
  private scanTimer?: number;

  readonly error = signal('');
  readonly result = signal<PassVerification | null>(null);
  readonly scanning = signal(false);

  readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(24)]],
  });

  ngAfterViewInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.form.controls.token.setValue(token);
      this.verify();
    }
  }

  verify(): void {
    if (this.form.invalid) return;
    this.error.set('');
    this.data.verifyVisitPass(this.form.controls.token.value).subscribe({
      next: result => this.result.set(result),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to verify pass'),
    });
  }

  checkIn(): void {
    const visit = this.result()?.visit;
    if (!visit) return;
    this.data.updateVisitStatus(visit.id, 'ARRIVED').subscribe({
      next: () => this.result.set({ ...this.result()!, reason: 'Visitor checked in', visit: { ...visit, status: 'ARRIVED' } }),
      error: (error: ApiError) => this.error.set(error.error || 'Unable to check in visitor'),
    });
  }

  async startCamera(): Promise<void> {
    const detectorCtor = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!detectorCtor || !navigator.mediaDevices?.getUserMedia) {
      this.error.set('Camera QR scanning is not available in this browser. Use manual token entry.');
      return;
    }

    this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = this.video?.nativeElement;
    if (!video) return;
    video.srcObject = this.stream;
    await video.play();
    this.scanning.set(true);

    const detector = new detectorCtor({ formats: ['qr_code'] });
    this.scanTimer = window.setInterval(async () => {
      if (!video.videoWidth) return;
      const codes = await detector.detect(video).catch(() => []);
      const rawValue = codes[0]?.rawValue;
      if (!rawValue) return;
      const token = this.extractToken(rawValue);
      this.form.controls.token.setValue(token);
      this.stopCamera();
      this.verify();
    }, 900);
  }

  stopCamera(): void {
    if (this.scanTimer) window.clearInterval(this.scanTimer);
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.scanning.set(false);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  private extractToken(value: string): string {
    try {
      const url = new URL(value);
      return url.searchParams.get('token') || value;
    } catch {
      return value;
    }
  }
}
