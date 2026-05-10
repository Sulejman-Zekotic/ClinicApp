import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import {
  AdminDashboardStats,
  MedicationHistoryService,
  MedicationUsageStat
} from '../../services/medication-history';
import { MedicationAlert, Medication, MedicationsService } from '../../services/medications';
import { NotificationItem, NotificationsService } from '../../services/notifications';
import { UserSummary, UsersService } from '../../services/users';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';

interface ChartPoint {
  x: number;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, LoadingSpinnerComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private historyService = inject(MedicationHistoryService);
  private medicationsService = inject(MedicationsService);
  private notificationsService = inject(NotificationsService);
  private usersService = inject(UsersService);

  readonly isAdmin = this.auth.isAdmin();

  adminStats: AdminDashboardStats | null = null;
  medicationUsage: MedicationUsageStat[] = [];
  alerts: MedicationAlert[] = [];
  notifications: NotificationItem[] = [];
  medications: Medication[] = [];
  users: UserSummary[] = [];

  isLoading = false;
  errorMessage = '';

  get medicationsCount(): number {
    return this.medications.length;
  }

  get lowStockCount(): number {
    return this.adminStats?.lowStockCount ?? this.alerts.length;
  }

  get activeUsersCount(): number {
    return this.users.length;
  }

  get todayActivityCount(): number {
    return this.adminStats?.todayCount ?? this.totalUsageCount;
  }

  get totalUsageCount(): number {
    return this.medicationUsage.reduce((sum, item) => sum + item.takenCount, 0);
  }

  get chartValues(): number[] {
    return this.adminStats?.last7Days.map((entry) => entry.count) ?? [];
  }

  get chartLabels(): string[] {
    return this.adminStats?.last7Days.map((entry) => this.formatDayLabel(entry.date)) ?? [];
  }

  get chartHasData(): boolean {
    return this.chartValues.some((value) => value > 0);
  }

  get topAlertItems(): Array<{ title: string; meta: string; tone: 'warn' | 'info' | 'good' }> {
    if (this.alerts.length > 0) {
      return this.alerts.slice(0, 4).map((alert) => ({
        title: `${alert.name}`,
        meta: `${alert.status} · ${alert.stock} / ${alert.minimumStock}`,
        tone: alert.stock === 0 ? 'warn' : 'info'
      }));
    }

    return this.notifications.slice(0, 4).map((notification) => ({
      title: notification.title,
      meta: notification.message,
      tone: notification.isRead ? 'good' : 'info'
    }));
  }

  ngOnInit(): void {
    this.loadPage();
  }

  loadPage(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const adminStatsRequest = this.isAdmin
      ? this.historyService.getAdminDashboardStats().pipe(catchError(() => of(null)))
      : of(null);

    const usersRequest = this.isAdmin
      ? this.usersService.getAll().pipe(catchError(() => of([] as UserSummary[])))
      : of([] as UserSummary[]);

    forkJoin({
      adminStats: adminStatsRequest,
      usage: this.historyService.getStats().pipe(catchError(() => of([] as MedicationUsageStat[]))),
      alerts: this.medicationsService.getAlerts().pipe(catchError(() => of([] as MedicationAlert[]))),
      medications: this.medicationsService.getAll().pipe(catchError(() => of([] as Medication[]))),
      notifications: this.notificationsService.getMine().pipe(catchError(() => of([] as NotificationItem[]))),
      users: usersRequest
    }).subscribe({
      next: (result) => {
        this.adminStats = result.adminStats;
        this.medicationUsage = result.usage;
        this.alerts = result.alerts;
        this.medications = result.medications;
        this.notifications = result.notifications;
        this.users = result.users;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Dashboard podaci nisu dostupni.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  chartPoints(values: number[]): string {
    return this.resolveChartPoints(values)
      .map((point) => `${point.x},${point.y}`)
      .join(' ');
  }

  chartDots(values: number[]): ChartPoint[] {
    return this.resolveChartPoints(values);
  }

  private resolveChartPoints(values: number[]): ChartPoint[] {
    const width = 740;
    const height = 240;
    const paddingX = 24;
    const paddingY = 28;
    const max = Math.max(...values, 1);

    if (values.length === 0) {
      return [];
    }

    return values.map((value, index) => {
      const x =
        values.length === 1
          ? width / 2
          : paddingX + (index * (width - paddingX * 2)) / (values.length - 1);

      const y = height - paddingY - (value / max) * (height - paddingY * 2);

      return { x, y };
    });
  }

 private formatDayLabel(dateValue: string): string {
  const date = new Date(dateValue);

  const dayNames = [
    'Ned',
    'Pon',
    'Uto',
    'Sri',
    'Čet',
    'Pet',
    'Sub'
  ];

  return dayNames[date.getDay()];
}
}
