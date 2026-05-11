import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ToastService } from '../../shared/toast/toast.service';
import {
  LucideUser,
  LucideLock,
  LucideEye,
  LucideEyeOff,
  LucideDynamicIcon
} from '@lucide/angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LoadingSpinnerComponent,
    LucideUser,
    LucideLock,
    LucideDynamicIcon
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  readonly EyeIcon = LucideEye;
  readonly EyeOffIcon = LucideEyeOff;

  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  showPassword = false;
  rememberMe = false;
  private returnUrl = '/dashboard';

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.router.navigateByUrl('/dashboard');
      return;
    }

    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  login(): void {
    if (this.isLoading) return;

    this.errorMessage = '';

    if (!this.username.trim() || !this.password.trim()) {
      this.errorMessage = 'Unesi username i lozinku.';
      return;
    }

    this.isLoading = true;

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.auth.saveSession(res, this.rememberMe);
        this.toast.success(`Dobrodosli nazad, ${res.username}.`);
        this.router.navigateByUrl(res.mustChangePassword ? '/account?forced=1' : this.returnUrl);
      },
      error: (err: any) => {
        this.errorMessage =
          err?.error?.message ||
          err?.error?.title ||
          'Pogresan username ili lozinka.';
        this.toast.error(this.errorMessage, 'Prijava nije uspjela');
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
