import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RuntimeConfigService } from '../core/runtime-config.service';
import { PagedRequest, PagedResult } from '../shared/pagination/pagination.models';

export interface MedicationHistoryRecord {
  id: number;
  medicationId: number;
  medicationName: string;
  userId: number;
  username: string;
  reason: string;
  medicationTakeReasonId?: number | null;
  medicationTakeReasonName?: string | null;
  quantity: number;
  takenAt: string;
}

export interface TakeMedicationRequest {
  medicationId: number;
  reason: string;
  quantity: number;
  medicationTakeReasonId?: number | null;
  reasonText?: string | null;
}

export interface TakeMedicationResponse {
  message: string;
  name: string;
  quantity: number;
  stock: number;
}

export interface MedicationUsageStat {
  medication: string;
  takenCount: number;
}

export interface ChartDataset {
  label: string;
  values: number[];
  totalCount: number;
}

export interface MedicationTrendChart {
  title: string;
  groupBy: string;
  labels: string[];
  datasets: ChartDataset[];
  totalCount: number;
  topMedication: string;
  topMedicationCount: number;
  range: string;
  fromDate: string;
  toDate: string;
}

export interface TopUsersChart {
  title: string;
  labels: string[];
  values: number[];
  totalCount: number;
  topUsername: string;
  topCount: number;
  range: string;
  fromDate: string;
  toDate: string;
  groupBy: string;
}

export interface DetailedChart {
  title: string;
  groupBy: string;
  labels: string[];
  values: number[];
  totalCount: number;
  peakValue: number;
  peakLabel: string;
  peakLabelHuman: string;
  range: string;
  fromDate: string;
  toDate: string;
}

export interface AdminDashboardStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  mostUsedMedication: string;
  mostUsedMedicationCount: number;
  mostCommonReason: string;
  mostCommonReasonCount: number;
  topMedications: Array<{ medication: string; count: number }>;
  topUsers: Array<{ username: string; count: number }>;
  topReasons: Array<{ reason: string; count: number }>;
  last7Days: Array<{ date: string; count: number }>;
}

export interface HistoryFilters extends PagedRequest {
  search?: string;
  fromDate?: string;
  toDate?: string;
  userId?: number | null;
  medicationId?: number | null;
  reason?: string;
  medicationTakeReasonId?: number | null;
}

export interface ChartFilters {
  range?: string;
  fromDate?: string;
  toDate?: string;
  groupBy?: string;
  userId?: number | null;
  medicationId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class MedicationHistoryService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/MedicationHistory`;
  }

  getAll(filters: HistoryFilters): Observable<MedicationHistoryRecord[]> {
    return this.getPaged({
      ...filters,
      page: 1,
      pageSize: 100
    }).pipe(map((result) => result.items));
  }

  getPaged(filters: HistoryFilters): Observable<PagedResult<MedicationHistoryRecord>> {
    return this.http.get<PagedResult<MedicationHistoryRecord>>(this.baseUrl, {
      params: this.createParams(filters)
    });
  }

  exportExcel(filters: HistoryFilters): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export/excel`, {
      params: this.createParams(filters),
      responseType: 'blob'
    });
  }

  takeMedication(payload: TakeMedicationRequest): Observable<TakeMedicationResponse> {
    return this.http.post<TakeMedicationResponse>(`${this.baseUrl}/take`, payload);
  }

  getByUser(userId: number): Observable<MedicationHistoryRecord[]> {
    return this.http.get<MedicationHistoryRecord[]>(`${this.baseUrl}/user/${userId}`);
  }

  getStats(): Observable<MedicationUsageStat[]> {
    return this.http.get<MedicationUsageStat[]>(`${this.baseUrl}/stats`);
  }

  getMedicationTrendChart(filters: ChartFilters): Observable<MedicationTrendChart> {
    return this.http.get<MedicationTrendChart>(`${this.baseUrl}/chart/medication-trend`, {
      params: this.createParams(filters)
    });
  }

  getTopUsersChart(filters: ChartFilters): Observable<TopUsersChart> {
    return this.http.get<TopUsersChart>(`${this.baseUrl}/chart/top-users`, {
      params: this.createParams(filters)
    });
  }

  getDetailedChart(filters: ChartFilters): Observable<DetailedChart> {
    return this.http.get<DetailedChart>(`${this.baseUrl}/chart/detailed`, {
      params: this.createParams(filters)
    });
  }

  getAdminDashboardStats(): Observable<AdminDashboardStats> {
    return this.http.get<AdminDashboardStats>(`${this.baseUrl}/admin-dashboard-stats`);
  }

  exportAdminDashboardStatsCsv(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/admin-dashboard-stats/export/csv`, {
      responseType: 'blob'
    });
  }

  private createParams<T extends object>(filters: T): HttpParams {
    let params = new HttpParams();

    for (const [key, value] of Object.entries(filters) as Array<
      [string, string | number | null | undefined]
    >) {
      if (value === null || value === undefined) {
        continue;
      }

      const stringValue = String(value).trim();
      if (!stringValue) {
        continue;
      }

      params = params.set(key, stringValue);
    }

    return params;
  }
}
