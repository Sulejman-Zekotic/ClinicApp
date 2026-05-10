import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { RuntimeConfigService } from '../core/runtime-config.service';
import { PagedRequest, PagedResult } from '../shared/pagination/pagination.models';

export interface Medication {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  manufacturer?: string | null;
  medicationManufacturerId?: number | null;
  strength?: string | null;
  unit?: string | null;
  stock: number;
  minimumStock: number;
  category?: string | null;
  requiresPrescription: boolean;
  medicationCategoryId?: number | null;
  medicationUnitId?: number | null;
}

export interface MedicationAlert {
  id: number;
  name: string;
  code: string;
  stock: number;
  minimumStock: number;
  category?: string | null;
  requiresPrescription: boolean;
  status: string;
}

export interface MedicationPayload {
  name: string;
  code: string;
  description?: string | null;
  manufacturer?: string | null;
  medicationManufacturerId?: number | null;
  strength?: string | null;
  unit?: string | null;
  stock: number;
  minimumStock: number;
  category?: string | null;
  requiresPrescription: boolean;
  medicationCategoryId?: number | null;
  medicationUnitId?: number | null;
}

export interface MedicationListRequest extends PagedRequest {
  search?: string;
  stockFilter?: string;
  categoryId?: number | null;
  manufacturerId?: number | null;
  unitId?: number | null;
}

export interface MedicationImportPreviewRow {
  rowNumber: number;
  name?: string | null;
  currentStock?: number | null;
  newStock?: number | null;
  action: string;
  message: string;
}

export interface MedicationImportPreviewResult {
  totalRows: number;
  addCount: number;
  updateCount: number;
  skipCount: number;
  rows: MedicationImportPreviewRow[];
}

export interface MedicationImportError {
  rowNumber: number;
  message: string;
}

export interface MedicationImportResult {
  totalRows: number;
  addedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: MedicationImportError[];
}

@Injectable({
  providedIn: 'root'
})
export class MedicationsService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/Medication`;
  }

  getAll(search?: string, stockFilter?: string): Observable<Medication[]> {
    const baseRequest: MedicationListRequest = {
      page: 1,
      pageSize: 100,
      search,
      stockFilter
    };

    return this.getPaged(baseRequest).pipe(
      switchMap((firstPage) => {
        if (firstPage.totalPages <= 1) {
          return of(firstPage.items);
        }

        const requests = Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
          this.getPaged({
            ...baseRequest,
            page: index + 2
          })
        );

        return forkJoin(requests).pipe(
          map((pages) => [firstPage, ...pages].flatMap((page) => page.items))
        );
      })
    );
  }

  getPaged(request: MedicationListRequest): Observable<PagedResult<Medication>> {
    let params = new HttpParams();

    if (request.search?.trim()) {
      params = params.set('search', request.search.trim());
    }

    if (request.stockFilter?.trim()) {
      params = params.set('stockFilter', request.stockFilter.trim());
    }

    if (request.categoryId) {
      params = params.set('categoryId', String(request.categoryId));
    }

    if (request.manufacturerId) {
      params = params.set('manufacturerId', String(request.manufacturerId));
    }

    if (request.unitId) {
      params = params.set('unitId', String(request.unitId));
    }

    if (request.page) {
      params = params.set('page', String(request.page));
    }

    if (request.pageSize) {
      params = params.set('pageSize', String(request.pageSize));
    }

    return this.http.get<PagedResult<Medication>>(this.baseUrl, { params });
  }

  getAlerts(): Observable<MedicationAlert[]> {
    return this.http.get<MedicationAlert[]>(`${this.baseUrl}/alerts`);
  }

  getById(id: number): Observable<Medication> {
    return this.http.get<Medication>(`${this.baseUrl}/${id}`);
  }

  add(payload: MedicationPayload): Observable<Medication> {
    return this.http.post<Medication>(this.baseUrl, payload);
  }

  update(id: number, payload: MedicationPayload): Observable<Medication> {
    return this.http.put<Medication>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  exportExcel(search?: string, stockFilter?: string): Observable<Blob> {
    let params = new HttpParams();

    if (search?.trim()) {
      params = params.set('search', search.trim());
    }

    if (stockFilter?.trim()) {
      params = params.set('stockFilter', stockFilter.trim());
    }

    return this.http.get(`${this.baseUrl}/export/excel`, {
      params,
      responseType: 'blob'
    });
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/import/template`, {
      responseType: 'blob'
    });
  }

  previewImport(file: File): Observable<MedicationImportPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<MedicationImportPreviewResult>(`${this.baseUrl}/import/excel/preview`, formData);
  }

  importExcel(file: File): Observable<MedicationImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<MedicationImportResult>(`${this.baseUrl}/import/excel`, formData);
  }
}
