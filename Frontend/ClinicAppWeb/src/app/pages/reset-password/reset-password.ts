import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  token = '';
  newPassword = '';
  confirmPassword = '';
  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.token) {
      this.errorMessage = 'This reset link is missing the security token.';
      return;
    }

    if (!this.newPassword.trim()) {
      this.errorMessage = 'Enter a new password.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Password confirmation does not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.confirmPasswordReset(this.token, this.newPassword).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Your password has been updated.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Password reset failed. Request a new reset link and try again.';
        this.toast.error(this.errorMessage);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
