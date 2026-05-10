import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  NotificationItem,
  NotificationPreferences,
  NotificationsService
} from '../../services/notifications';
import { ConfirmDialogService } from '../../shared/confirm-dialog/confirm-dialog.service';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';

type BrowserPermissionState = 'unsupported' | NotificationPermission;

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, LoadingSpinnerComponent],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class NotificationsComponent implements OnInit {
  private notificationsService = inject(NotificationsService);
  private confirmDialog = inject(ConfirmDialogService);

  notifications: NotificationItem[] = [];
  preferences: NotificationPreferences = {
    receiveLowStockNotifications: true,
    receiveOutOfStockNotifications: true,
    receiveMedicationTakenNotifications: false,
    receiveImportSummaryNotifications: true
  };

  browserPermission: BrowserPermissionState = 'unsupported';
  devicePushEnabled = false;
  currentEndpoint = '';
  isPushSupported = false;
  advancedPreferencesOpen = false;
  isLoading = false;
  isSaving = false;
  search = '';
  stateFilter = 'all';
  errorMessage = '';
  successMessage = '';

  get unreadCount(): number {
    return this.notifications.filter((item) => !item.isRead).length;
  }

  get filteredNotifications(): NotificationItem[] {
    const search = this.search.trim().toLowerCase();

    return [...this.notifications]
      .sort((left, right) => Number(left.isRead) - Number(right.isRead))
      .filter((item) => {
        const matchesState =
          this.stateFilter === 'all' ||
          (this.stateFilter === 'unread' && !item.isRead) ||
          (this.stateFilter === 'read' && item.isRead);
        const matchesSearch =
          !search ||
          item.title.toLowerCase().includes(search) ||
          item.message.toLowerCase().includes(search) ||
          item.type.toLowerCase().includes(search);

        return matchesState && matchesSearch;
      });
  }

  get hasNotifications(): boolean {
    return this.filteredNotifications.length > 0;
  }

  ngOnInit(): void {
    this.isPushSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    this.syncBrowserPermission();
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationsService.getPreferences().subscribe({
      next: (preferences) => {
        this.preferences = preferences;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Ucitavanje postavki nije uspjelo.';
      }
    });

    this.notificationsService.getMine().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.notificationsService.setUnreadCount(this.unreadCount);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Ucitavanje obavijesti nije uspjelo.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });

    void this.syncPushSubscriptionState();
  }

  savePreferences(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationsService.updatePreferences(this.preferences).subscribe({
      next: (response) => {
        this.successMessage = response.message;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Spremanje postavki nije uspjelo.';
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  markAsRead(item: NotificationItem): void {
    if (item.isRead) {
      return;
    }

    this.notificationsService.markAsRead(item.id).subscribe({
      next: () => {
        item.isRead = true;
        this.notificationsService.setUnreadCount(this.unreadCount);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Oznacavanje obavijesti nije uspjelo.';
      }
    });
  }

  async markAllAsRead(): Promise<void> {
    const confirmed = await this.confirmDialog.open({
      title: 'Oznaciti sve obavijesti kao procitane?',
      message: 'Sve trenutne obavijesti ce biti prebacene u procitano stanje.',
      confirmLabel: 'Oznaci sve'
    });

    if (!confirmed) {
      return;
    }

    this.notificationsService.markAllAsRead().subscribe({
      next: (response) => {
        this.notifications = this.notifications.map((item) => ({
          ...item,
          isRead: true
        }));
        this.notificationsService.setUnreadCount(0);
        this.successMessage = response.message;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Oznacavanje svih obavijesti nije uspjelo.';
      }
    });
  }

  async enablePushOnDevice(): Promise<void> {
    if (!this.isPushSupported) {
      this.errorMessage = 'Push notifikacije nisu podrzane u ovom browseru.';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    try {
      const permission = await Notification.requestPermission();
      this.syncBrowserPermission();

      if (permission !== 'granted') {
        this.errorMessage = 'Browser nije odobrio push notifikacije.';
        return;
      }

      const keyResponse = await firstValueFrom(this.notificationsService.getPushPublicKey());
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();

      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(keyResponse.publicKey) as BufferSource
        }));

      await firstValueFrom(
        this.notificationsService.savePushSubscription(this.mapSubscription(subscription))
      );

      this.devicePushEnabled = true;
      this.currentEndpoint = subscription.endpoint;
      this.successMessage = 'Push notifikacije su ukljucene na ovom uredjaju.';
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Aktivacija push notifikacija nije uspjela.';
    }
  }

  async disablePushOnDevice(): Promise<void> {
    if (!this.isPushSupported) {
      this.devicePushEnabled = false;
      this.currentEndpoint = '';
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        this.devicePushEnabled = false;
        this.currentEndpoint = '';
        this.successMessage = 'Push pretplata je vec iskljucena.';
        return;
      }

      await firstValueFrom(
        this.notificationsService.deletePushSubscription({
          endpoint: subscription.endpoint
        })
      );
      await subscription.unsubscribe();

      this.devicePushEnabled = false;
      this.currentEndpoint = '';
      this.successMessage = 'Push notifikacije su iskljucene na ovom uredjaju.';
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Gasenje push notifikacija nije uspjelo.';
    }
  }

  async syncPushSubscriptionState(): Promise<void> {
    this.syncBrowserPermission();

    if (!this.isPushSupported) {
      this.devicePushEnabled = false;
      this.currentEndpoint = '';
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      this.devicePushEnabled = !!subscription;
      this.currentEndpoint = subscription?.endpoint || '';
    } catch {
      this.devicePushEnabled = false;
      this.currentEndpoint = '';
    }
  }

  private syncBrowserPermission(): void {
    if (!this.isPushSupported) {
      this.browserPermission = 'unsupported';
      return;
    }

    this.browserPermission = Notification.permission;
  }

  private mapSubscription(subscription: PushSubscription): {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  } {
    const raw = subscription.toJSON();

    return {
      endpoint: subscription.endpoint,
      p256dh: raw.keys?.['p256dh'] || '',
      auth: raw.keys?.['auth'] || '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    };
  }

  private urlBase64ToUint8Array(value: string): Uint8Array {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let index = 0; index < rawData.length; ++index) {
      outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray;
  }
}
