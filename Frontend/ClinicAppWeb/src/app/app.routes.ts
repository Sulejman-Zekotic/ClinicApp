import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout';
import { AccountComponent } from './pages/account/account';
import { AnalyticsComponent } from './pages/analytics/analytics';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';
import { HistoryComponent } from './pages/history/history';
import { LoginComponent } from './pages/login/login';
import { MedicationsComponent } from './pages/medications/medications';
import { NotificationsComponent } from './pages/notifications/notifications';
import { ResetPasswordComponent } from './pages/reset-password/reset-password';
import { UsersComponent } from './pages/users/users';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent
  },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent
      },
      {
        path: 'medications',
        component: MedicationsComponent
      },
      {
        path: 'users',
        component: UsersComponent,
        canActivate: [authGuard],
        data: { adminOnly: true }
      },
      {
        path: 'history',
        component: HistoryComponent
      },
      {
        path: 'analytics',
        component: AnalyticsComponent
      },
      {
        path: 'notifications',
        component: NotificationsComponent
      },
      {
        path: 'account',
        component: AccountComponent
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
