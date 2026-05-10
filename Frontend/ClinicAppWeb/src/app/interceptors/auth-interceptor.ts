import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  const isAuthEndpoint =
    req.url.includes('/User/login') || req.url.includes('/User/refresh');

  const authReq =
    token && !isAuthEndpoint
      ? req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        })
      : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const shouldTryRefresh =
        error.status === 401 &&
        !isAuthEndpoint &&
        !isRefreshing &&
        !!auth.getRefreshToken() &&
        !!auth.getUserId();

      if (!shouldTryRefresh) {
        if (error.status === 401 && !isAuthEndpoint) {
          auth.clearSession();
          router.navigateByUrl('/login');
        }

        return throwError(() => error);
      }

      isRefreshing = true;

      const userId = auth.getUserId()!;
      const refreshToken = auth.getRefreshToken()!;

      return auth.refresh(userId, refreshToken).pipe(
        switchMap((refreshResponse) => {
          auth.saveSession(refreshResponse);
          isRefreshing = false;

          const retryReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${refreshResponse.token}`
            }
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          isRefreshing = false;
          auth.clearSession();
          router.navigateByUrl('/login');
          return throwError(() => refreshError);
        })
      );
    })
  );
};