import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        returnUrl: state.url
      }
    });
  }

  // Force the password update flow before the rest of the app becomes available.
  if (auth.getMustChangePassword() && !state.url.startsWith('/account')) {
    return router.createUrlTree(['/account'], {
      queryParams: { forced: '1' }
    });
  }

  return true;
};
