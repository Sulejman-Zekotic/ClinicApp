import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { RuntimeConfigService } from '../core/runtime-config.service';

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}

export interface NotificationPreferences {
  receiveLowStockNotifications: boolean;
  receiveOutOfStockNotifications: boolean;
  receiveMedicationTakenNotifications: boolean;
  receiveImportSummaryNotifications: boolean;
}

export interface SavePushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

export interface DeletePushSubscriptionRequest {
  endpoint: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationsService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  readonly unreadCount$ = this.unreadCountSubject.asObservable();

  private get baseUrl(): string {
    return `${this.config.apiUrl}/Notification`;
  }

  getMine(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(this.baseUrl);
  }

  getUnreadCount(): Observable<NotificationUnreadCount> {
    return this.http.get<NotificationUnreadCount>(`${this.baseUrl}/unread-count`).pipe(
      tap((response) => this.unreadCountSubject.next(response.unreadCount))
    );
  }

  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.baseUrl}/preferences`);
  }

  updatePreferences(payload: NotificationPreferences): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.baseUrl}/preferences`, payload);
  }

  markAsRead(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${id}/read`, {}).pipe(
      tap(() => this.unreadCountSubject.next(Math.max(this.unreadCountSubject.value - 1, 0)))
    );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/read-all`, {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  getPushPublicKey(): Observable<{ publicKey: string }> {
    return this.http.get<{ publicKey: string }>(`${this.baseUrl}/push-public-key`);
  }

  savePushSubscription(payload: SavePushSubscriptionRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/push-subscription`, payload);
  }

  deletePushSubscription(payload: DeletePushSubscriptionRequest): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/push-subscription`, {
      body: payload
    });
  }

  setUnreadCount(count: number): void {
    this.unreadCountSubject.next(count);
  }
}
