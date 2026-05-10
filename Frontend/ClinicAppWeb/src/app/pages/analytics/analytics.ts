import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { AuthService } from '../../services/auth';
import { AdminDashboardStats, MedicationHistoryService } from '../../services/medication-history';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';

interface AnalyticsSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, LucideDynamicIcon, LoadingSpinnerComponent],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class AnalyticsComponent implements OnInit {
  private historyService = inject(MedicationHistoryService);
  private auth = inject(AuthService);

  readonly isAdmin = this.auth.isAdmin();
  readonly reasonColors = ['#245fef', '#34a885', '#f59e0b', '#7257ff', '#ff6a2b'];

  adminStats: AdminDashboardStats | null = null;
  summaryLoading = false;
  errorMessage = '';

  get reasonSegments(): AnalyticsSegment[] {
    const items = this.adminStats?.topReasons.slice(0, 5) ?? [];
    const total = items.reduce((sum, item) => sum + item.count, 0) || 1;

    return items.map((item, index) => ({
      label: item.reason,
      value: item.count,
      color: this.reasonColors[index % this.reasonColors.length],
      percentage: (item.count / total) * 100
    }));
  }

  get reasonChartBackground(): string {
    if (!this.reasonSegments.length) {
      return 'conic-gradient(#e7eef8 0 100%)';
    }

    let offset = 0;
    const parts = this.reasonSegments.map((segment) => {
      const start = offset;
      offset += segment.percentage;
      return `${segment.color} ${start}% ${offset}%`;
    });

    return `conic-gradient(${parts.join(', ')})`;
  }

  get reasonTotal(): number {
    return this.reasonSegments.reduce((sum, segment) => sum + segment.value, 0);
  }

  get topMedicationMax(): number {
    return Math.max(...(this.adminStats?.topMedications.map((item) => item.count) ?? [0]), 1);
  }

  get topUserMax(): number {
    return Math.max(...(this.adminStats?.topUsers.map((item) => item.count) ?? [0]), 1);
  }

  get last7DaysMax(): number {
    return Math.max(...(this.adminStats?.last7Days.map((item) => item.count) ?? [0]), 1);
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      return;
    }

    this.loadSummary();
  }

  loadSummary(): void {
    this.summaryLoading = true;
    this.errorMessage = '';

    this.historyService.getAdminDashboardStats().subscribe({
      next: (stats) => {
        this.adminStats = stats;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Učitavanje analitike nije uspjelo.';
        this.adminStats = null;
        this.summaryLoading = false;
      },
      complete: () => {
        this.summaryLoading = false;
      }
    });
  }

  medicationBarHeight(value: number): string {
    return `${Math.max((value / this.topMedicationMax) * 100, value > 0 ? 16 : 6)}%`;
  }

  userBarWidth(value: number): string {
    return `${Math.max((value / this.topUserMax) * 100, value > 0 ? 18 : 0)}%`;
  }

  dayBarHeight(value: number): string {
    return `${Math.max((value / this.last7DaysMax) * 100, value > 0 ? 16 : 6)}%`;
  }
}
