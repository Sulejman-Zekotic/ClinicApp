import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from '../core/runtime-config.service';

export interface LookupItem {
  id: number;
  name: string;
  symbol?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LookupService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/Lookup`;
  }

  getMedicationCategories(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.baseUrl}/medication-categories`);
  }

  getMedicationUnits(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.baseUrl}/medication-units`);
  }

  getMedicationManufacturers(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.baseUrl}/medication-manufacturers`);
  }

  getMedicationTakeReasons(): Observable<LookupItem[]> {
    return this.http.get<LookupItem[]>(`${this.baseUrl}/medication-take-reasons`);
  }
}
