import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, catchError, debounceTime, forkJoin, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import {
  DetailedChart,
  MedicationHistoryService,
  MedicationHistoryRecord,
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
  imports: [CommonModule, FormsModule, LucideDynamicIcon, LoadingSpinnerComponent],
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
  filtersOpen = false;

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

  get topReasonSegment(): AnalyticsSegment | null {
    return this.reasonSegments[0] ?? null;
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

  get medicationTicks(): number[] {
    const max = Math.max(this.medicationMax, 5);
    return Array.from({ length: max + 1 }, (_, index) => max - index);
  }

  get topMedicationBar(): { label: string; value: number } | null {
    return this.medicationBars[0] ?? null;
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

  get topUserRows(): Array<{ label: string; value: number; percentage: number }> {
    const total = this.topUserValues.reduce((sum, value) => sum + value, 0) || 1;

    return this.topUserLabels.map((label, index) => ({
      label,
      value: this.topUserValues[index] ?? 0,
      percentage: ((this.topUserValues[index] ?? 0) / total) * 100
    }));
  }

  get topUserRow(): { label: string; value: number; percentage: number } | null {
    return this.topUserRows[0] ?? null;
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

  openFilters(): void {
    this.filtersOpen = true;
  }

  closeFilters(): void {
    this.filtersOpen = false;
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

    this.loadFallbackAnalytics();

    forkJoin({
      medicationTrend: this.historyService.getMedicationTrendChart(filters).pipe(catchError(() => of(null))),
      topUsers: this.historyService.getTopUsersChart(filters).pipe(catchError(() => of(null))),
      topReasons: this.historyService.getTopReasonsChart(filters).pipe(catchError(() => of(null))),
      detailed: this.historyService.getDetailedChart(filters).pipe(catchError(() => of(null)))
    }).subscribe({
      next: (result) => {
        if (result.medicationTrend) {
          this.medicationTrendChart = result.medicationTrend;
        }

        if (result.topUsers) {
          this.topUsersChart = result.topUsers;
        }

        if (result.topReasons) {
          this.topReasonsChart = result.topReasons;
        }

        if (result.detailed) {
          this.detailedChart = result.detailed;
        }
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Ucitavanje analitike nije uspjelo.';
        this.isLoading = false;
      }
    });
  }

  private loadFallbackAnalytics(): void {
    const { start, end } = this.resolveSelectedDateRange();

    this.historyService
      .getAll({
        page: 1,
        pageSize: 100,
        fromDate: this.formatDate(start),
        toDate: this.formatDate(end),
        userId: this.isAdmin ? this.selectedUserId : null,
        medicationId: this.selectedMedicationId
      })
      .subscribe({
        next: (records) => {
          this.buildFallbackCharts(records, start, end);
          this.errorMessage = '';
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Ucitavanje analitike nije uspjelo.';
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  private buildFallbackCharts(records: MedicationHistoryRecord[], start: Date, end: Date): void {
    const groupBy = this.resolveGroupBy(start, end);
    const buckets = this.generateBuckets(start, end, groupBy);
    const labels = buckets.map((bucket) => this.formatBucketLabel(bucket, groupBy));

    const medicationCounts = this.countBy(records, (record) => record.medicationName || '-');
    const topMedications = [...medicationCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5);

    this.medicationTrendChart = {
      title: this.isAdmin ? 'Najkoristeniji lijekovi kroz vrijeme' : 'Moji najkoristeniji lijekovi kroz vrijeme',
      groupBy,
      labels,
      datasets: topMedications.map(([label, totalCount]) => ({
        label,
        totalCount,
        values: buckets.map(
          (bucket) =>
            records.filter(
              (record) =>
                record.medicationName === label &&
                this.sameDate(this.getBucketStart(new Date(record.takenAt), groupBy), bucket)
            ).length
        )
      })),
      totalCount: records.length,
      topMedication: topMedications[0]?.[0] ?? '-',
      topMedicationCount: topMedications[0]?.[1] ?? 0,
      range: this.range,
      fromDate: this.formatDate(start),
      toDate: this.formatDate(end)
    };

    const userCounts = this.countBy(records, (record) => record.username || '-');
    const topUsers = [...userCounts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 10);

    this.topUsersChart = {
      title: this.isAdmin ? 'Najaktivniji korisnici' : 'Moja aktivnost',
      labels: topUsers.map(([label]) => label),
      values: topUsers.map(([, value]) => value),
      totalCount: topUsers.reduce((sum, [, value]) => sum + value, 0),
      topUsername: topUsers[0]?.[0] ?? '-',
      topCount: topUsers[0]?.[1] ?? 0,
      range: this.range,
      fromDate: this.formatDate(start),
      toDate: this.formatDate(end),
      groupBy: 'range'
    };

    const reasonCounts = this.countBy(records, (record) => record.medicationTakeReasonName || record.reason || '-');
    const topReasons = [...reasonCounts.entries()]
      .filter(([label]) => label !== '-')
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5);

    this.topReasonsChart = {
      title: 'Najcesci razlozi',
      labels: topReasons.map(([label]) => label),
      values: topReasons.map(([, value]) => value),
      totalCount: topReasons.reduce((sum, [, value]) => sum + value, 0),
      topReason: topReasons[0]?.[0] ?? '-',
      topCount: topReasons[0]?.[1] ?? 0,
      range: this.range,
      fromDate: this.formatDate(start),
      toDate: this.formatDate(end)
    };

    const detailedValues = buckets.map(
      (bucket) =>
        records.filter((record) =>
          this.sameDate(this.getBucketStart(new Date(record.takenAt), groupBy), bucket)
        ).length
    );
    const peakValue = Math.max(...detailedValues, 0);
    const peakIndex = peakValue > 0 ? detailedValues.indexOf(peakValue) : -1;

    this.detailedChart = {
      title: this.isAdmin ? 'Detaljni pregled svih uzimanja' : 'Moj detaljni pregled',
      groupBy,
      labels,
      values: detailedValues,
      totalCount: records.length,
      peakValue,
      peakLabel: peakIndex >= 0 ? labels[peakIndex] : '',
      peakLabelHuman: peakIndex >= 0 ? labels[peakIndex] : '',
      range: this.range,
      fromDate: this.formatDate(start),
      toDate: this.formatDate(end)
    };
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

  private resolveSelectedDateRange(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end);

    if (this.range === 'custom') {
      return {
        start: this.fromDate ? new Date(`${this.fromDate}T00:00:00`) : start,
        end: this.toDate ? new Date(`${this.toDate}T23:59:59`) : end
      };
    }

    const dayCount = this.range === '7d' ? 7 : this.range === '90d' ? 90 : this.range === '365d' ? 365 : 30;
    start.setDate(end.getDate() - dayCount + 1);
    start.setHours(0, 0, 0, 0);

    return { start, end };
  }

  private resolveGroupBy(start: Date, end: Date): string {
    if (this.groupBy === 'day' || this.groupBy === 'week' || this.groupBy === 'month') {
      return this.groupBy;
    }

    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    return totalDays <= 31 ? 'day' : totalDays <= 180 ? 'week' : 'month';
  }

  private generateBuckets(start: Date, end: Date, groupBy: string): Date[] {
    const buckets: Date[] = [];
    const current = this.getBucketStart(start, groupBy);
    const limit = this.getBucketStart(end, groupBy);

    while (current <= limit) {
      buckets.push(new Date(current));

      if (groupBy === 'month') {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setDate(current.getDate() + (groupBy === 'week' ? 7 : 1));
      }
    }

    return buckets;
  }

  private getBucketStart(date: Date, groupBy: string): Date {
    const bucket = new Date(date);
    bucket.setHours(0, 0, 0, 0);

    if (groupBy === 'month') {
      bucket.setDate(1);
      return bucket;
    }

    if (groupBy === 'week') {
      const diff = bucket.getDay() === 0 ? 6 : bucket.getDay() - 1;
      bucket.setDate(bucket.getDate() - diff);
    }

    return bucket;
  }

  private formatBucketLabel(bucket: Date, groupBy: string): string {
    const day = String(bucket.getDate()).padStart(2, '0');
    const month = String(bucket.getMonth() + 1).padStart(2, '0');
    const year = bucket.getFullYear();

    if (groupBy === 'month') {
      return `${month}.${year}`;
    }

    if (groupBy === 'week') {
      return `Sedmica ${day}.${month}`;
    }

    return `${day}.${month}.${year}`;
  }

  private countBy(records: MedicationHistoryRecord[], selector: (record: MedicationHistoryRecord) => string): Map<string, number> {
    const counts = new Map<string, number>();

    for (const record of records) {
      const key = selector(record).trim() || '-';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return counts;
  }

  private sameDate(left: Date, right: Date): boolean {
    return left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();
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
