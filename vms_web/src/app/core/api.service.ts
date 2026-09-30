import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiError } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.apiBaseUrl;

  private readonly pendingRequests = signal(0);
  readonly busy = computed(() => this.pendingRequests() > 0);

  get<T>(path: string): Observable<T> {
    return this.request('GET', path);
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.request('POST', path, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.request('PATCH', path, body);
  }

  private request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Observable<T> {
    this.pendingRequests.update(value => value + 1);
    const headers = method === 'GET' ? undefined : new HttpHeaders({ 'X-CSRF-Token': this.csrfToken() });
    const request$ = this.http.request<T>(method, `${this.baseUrl}${path}`, {
      body,
      headers,
      withCredentials: true,
    });

    return request$.pipe(
      catchError((error: HttpErrorResponse) => throwError(() => this.normalizeError(error))),
      source => new Observable<T>(subscriber => {
        const sub = source.subscribe(subscriber);
        return () => {
          this.pendingRequests.update(value => Math.max(0, value - 1));
          sub.unsubscribe();
        };
      }),
    );
  }

  private csrfToken(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    const cookie = document.cookie
      .split('; ')
      .find(value => value.startsWith('vms_csrf='));
    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
  }

  private normalizeError(error: HttpErrorResponse): ApiError {
    if (error.error && typeof error.error === 'object') return error.error as ApiError;
    if (error.status === 0) return { error: 'API is not reachable. Confirm the backend is running on port 3000.' };
    if (error.status === 401) return { error: 'Your session has expired. Sign in again.' };
    if (error.status === 403) return { error: 'You do not have access to perform this action.' };
    return { error: error.statusText || 'Request failed' };
  }
}
