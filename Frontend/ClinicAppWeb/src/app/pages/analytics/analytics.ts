import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import {
  DetailedChart,
  MedicationHistoryService,
  MedicationTrendChart,
  TopReasonsChart,
  TopUsersChart
} from '../../services/medication-history';
import { Medication, MedicationsService } from '../../services/medications';
import { UserSummary, UsersService } from '../../services/users';
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
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss'
})
export class AnalyticsComponent implements OnInit {
  private historyService = inject(MedicationHistoryService);
  private medicationsService = inject(MedicationsService);
  private usersService = inject(UsersService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private filterChanges = new Subject<void>();

  readonly isAdmin = this.auth.isAdmin();
  readonly reasonColors = ['#245fef', '#34a885', '#f59e0b', '#7257ff', '#ff6a2b'];

  medications: Medication[] = [];
  users: UserSummary[] = [];

  range = '30d';
  groupBy = 'day';
  fromDate = '';
  toDate = '';
  selectedUserId: number | null = null;
  selectedMedicationId: number | null = null;

  medicationTrendChart: MedicationTrendChart | null = null;
  topUsersChart: TopUsersChart | null = null;
  topReasonsChart: TopReasonsChart | null = null;
  detailedChart: DetailedChart | null = null;

  isLoading = false;
  errorMessage = '';

  get reasonSegments(): AnalyticsSegment[] {
    const labels = this.topReasonsChart?.labels ?? [];
    const values = this.topReasonsChart?.values ?? [];
    const total = values.reduce((sum, value) => sum + value, 0) || 1;

    return labels.map((label, index) => ({
      label,
      value: values[index] ?? 0,
      color: this.reasonColors[index % this.reasonColors.length],
      percentage: ((values[index] ?? 0) / total) * 100
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

  get reasonsTotal(): number {
    return this.reasonSegments.reduce((sum, segment) => sum + segment.value, 0);
  }

  get medicationBars(): Array<{ label: string; value: number }> {
    return (
      this.medicationTrendChart?.datasets
        .map((dataset) => ({
          label: dataset.label,
          value: dataset.totalCount
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 5) ?? []
    );
  }

  get medicationMax(): number {
    return Math.max(...this.medicationBars.map((item) => item.value), 1);
  }

  get usersMax(): number {
    return Math.max(...(this.topUsersChart?.values ?? [0]), 1);
  }

  get topUserLabels(): string[] {
    return this.topUsersChart?.labels ?? [];
  }

  get topUserValues(): number[] {
    return this.topUsersChart?.values ?? [];
  }

  get detailedLabels(): string[] {
    return this.detailedChart?.labels ?? [];
  }

  get detailedValues(): number[] {
    return this.detailedChart?.values ?? [];
  }

  get timeMax(): number {
    return Math.max(...(this.detailedChart?.values ?? [0]), 1);
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadLookupOptions();

    this.filterChanges
      .pipe(debounceTime(260), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadAnalytics());

    this.loadAnalytics();
  }

  queueRefresh(): void {
    this.filterChanges.next();
  }

  resetFilters(): void {
    this.range = '30d';
    this.groupBy = 'day';
    this.selectedMedicationId = null;
    this.selectedUserId = null;
    this.setDefaultDates();
    this.loadAnalytics();
  }

  medicationBarHeight(value: number): string {
    return `${Math.max((value / this.medicationMax) * 100, value > 0 ? 16 : 6)}%`;
  }

  userBarWidth(value: number): string {
    return `${Math.max((value / this.usersMax) * 100, value > 0 ? 18 : 0)}%`;
  }

  timeBarHeight(value: number): string {
    return `${Math.max((value / this.timeMax) * 100, value > 0 ? 16 : 6)}%`;
  }

  shortLabel(label: string): string {
    return label.length > 10 ? label.slice(0, 10) : label;
  }

  private loadLookupOptions(): void {
    this.medicationsService.getAll().subscribe({
      next: (items) => {
        this.medications = items;
      },
      error: () => {
        this.medications = [];
      }
    });

    if (this.isAdmin) {
      this.usersService.getAll().subscribe({
        next: (items) => {
          this.users = items;
        },
        error: () => {
          this.users = [];
        }
      });
    }
  }

  private loadAnalytics(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters = this.buildFilters();

    forkJoin({
      medicationTrend: this.historyService.getMedicationTrendChart(filters).pipe(catchError(() => of(null))),
      topUsers: this.historyService.getTopUsersChart(filters).pipe(catchError(() => of(null))),
      topReasons: this.historyService.getTopReasonsChart(filters).pipe(catchError(() => of(null))),
      detailed: this.historyService.getDetailedChart(filters).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (result) => {
        this.medicationTrendChart = result.medicationTrend;
        this.topUsersChart = result.topUsers;
        this.topReasonsChart = result.topReasons;
        this.detailedChart = result.detailed;
        this.errorMessage = Object.values(result).some((chart) => chart === null)
          ? 'Dio analitike trenutno nije dostupan.'
          : '';
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Ucitavanje analitike nije uspjelo.';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  private buildFilters() {
    const useCustomRange = this.range === 'custom';

    return {
      range: this.range,
      groupBy: this.groupBy,
      fromDate: useCustomRange ? this.fromDate || undefined : undefined,
      toDate: useCustomRange ? this.toDate || undefined : undefined,
      userId: this.isAdmin ? this.selectedUserId : null,
      medicationId: this.selectedMedicationId
    };
  }

  private setDefaultDates(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    this.fromDate = this.formatDate(start);
    this.toDate = this.formatDate(end);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
