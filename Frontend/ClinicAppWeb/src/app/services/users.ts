import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { RuntimeConfigService } from '../core/runtime-config.service';
import { PagedRequest, PagedResult } from '../shared/pagination/pagination.models';

export interface UserSummary {
  id: number;
  username: string;
  email: string;
  role: string;
  mustChangePassword?: boolean;
  lastSuccessfulLoginAtUtc?: string | null;
}

export interface AddUserRequest {
  username: string;
  email: string;
  role: string;
}

export interface CreatedUserResponse extends UserSummary {
  setupLinkSent: boolean;
}

export interface ResetUserPasswordResponse {
  username: string;
  temporaryPassword: string;
}

export interface UserLog {
  id: number;
  action: string;
  username: string;
  details: string;
  timestamp: string;
}

export interface UsersListRequest extends PagedRequest {
  search?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsersService {
  private http = inject(HttpClient);
  private config = inject(RuntimeConfigService);

  private get baseUrl(): string {
    return `${this.config.apiUrl}/User`;
  }

  getAll(): Observable<UserSummary[]> {
    const baseRequest: UsersListRequest = {
      page: 1,
      pageSize: 100
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

  getPaged(request: UsersListRequest): Observable<PagedResult<UserSummary>> {
    let params = new HttpParams();

    if (request.search?.trim()) {
      params = params.set('search', request.search.trim());
    }

    if (request.role?.trim()) {
      params = params.set('role', request.role.trim());
    }

    if (request.page) {
      params = params.set('page', String(request.page));
    }

    if (request.pageSize) {
      params = params.set('pageSize', String(request.pageSize));
    }

    return this.http.get<PagedResult<UserSummary>>(this.baseUrl, { params });
  }

  add(payload: AddUserRequest): Observable<CreatedUserResponse> {
    return this.http.post<CreatedUserResponse>(this.baseUrl, payload);
  }

  resetPassword(id: number): Observable<ResetUserPasswordResponse> {
    return this.http.post<ResetUserPasswordResponse>(`${this.baseUrl}/${id}/reset-password`, {});
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  getLogs(): Observable<UserLog[]> {
    return this.http.get<UserLog[]>(`${this.baseUrl}/logs`);
  }
}
