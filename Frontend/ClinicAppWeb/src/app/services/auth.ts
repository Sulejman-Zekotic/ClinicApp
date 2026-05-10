import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../core/runtime-config.service';

export interface LoginResponse {
  token: string;
  refreshToken: string;
  id: number;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

export interface MeResponse {
  id: number;
  username: string;
  role: string;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);
  private readonly sessionKeys = [
    'token',
    'refreshToken',
    'userId',
    'username',
    'role',
    'mustChangePassword',
    'rememberMe'
  ] as const;

  private get baseUrl(): string {
    return `${this.config.apiUrl}/User`;
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, {
      username,
      password
    });
  }

  refresh(userId: number, refreshToken: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/refresh`, {
      userId,
      refreshToken
    });
  }

  me(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.baseUrl}/me`);
  }

  logout(): Observable<object> {
    return this.http.post(`${this.baseUrl}/logout`, {});
  }

  changePassword(payload: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/change-password`, payload);
  }

  requestPasswordReset(usernameOrEmail: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/request-password-reset`, {
      usernameOrEmail
    });
  }

  confirmPasswordReset(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/confirm-password-reset`, {
      token,
      newPassword
    });
  }

  saveSession(data: LoginResponse, rememberMe = true): void {
    this.clearSession();
    const storage = this.resolveStorage(rememberMe);

    storage.setItem('token', data.token);
    storage.setItem('refreshToken', data.refreshToken);
    storage.setItem('userId', String(data.id));
    storage.setItem('username', data.username);
    storage.setItem('role', data.role);
    storage.setItem('mustChangePassword', String(data.mustChangePassword));
    storage.setItem('rememberMe', String(rememberMe));
  }

  clearSession(): void {
    for (const storage of this.storages()) {
      for (const key of this.sessionKeys) {
        storage.removeItem(key);
      }
    }
  }

  getToken(): string | null {
    return this.readValue('token');
  }

  getRefreshToken(): string | null {
    return this.readValue('refreshToken');
  }

  getUserId(): number | null {
    const raw = this.readValue('userId');
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  getUsername(): string {
    return this.readValue('username') ?? '';
  }

  getRole(): string {
    return this.readValue('role') ?? '';
  }

  getMustChangePassword(): boolean {
    return this.readValue('mustChangePassword') === 'true';
  }

  setMustChangePassword(value: boolean): void {
    const storage = this.findActiveStorage();
    storage?.setItem('mustChangePassword', String(value));
  }

  usesPersistentSession(): boolean {
    return this.readValue('rememberMe') === 'true';
  }

  isAdmin(): boolean {
    return this.getRole().toLowerCase() === 'admin';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private resolveStorage(rememberMe: boolean): Storage {
    if (typeof window === 'undefined') {
      throw new Error('Storage is not available outside the browser.');
    }

    return rememberMe ? window.localStorage : window.sessionStorage;
  }

  private storages(): Storage[] {
    if (typeof window === 'undefined') {
      return [];
    }

    return [window.localStorage, window.sessionStorage];
  }

  private readValue(key: (typeof this.sessionKeys)[number]): string | null {
    for (const storage of this.storages()) {
      const value = storage.getItem(key);
      if (value !== null) {
        return value;
      }
    }

    return null;
  }

  private findActiveStorage(): Storage | null {
    for (const storage of this.storages()) {
      if (storage.getItem('token')) {
        return storage;
      }
    }

    return null;
  }
}
