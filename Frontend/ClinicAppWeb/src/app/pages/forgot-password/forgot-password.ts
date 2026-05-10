import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LoadingSpinnerComponent],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  usernameOrEmail = '';
  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  submit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (!this.usernameOrEmail.trim()) {
      this.errorMessage = 'Enter your username or email address first.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.auth.requestPasswordReset(this.usernameOrEmail.trim()).subscribe({
      next: (response) => {
        this.successMessage = response.message;
        this.toast.success('Password reset instructions have been sent.');
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Reset request failed. Please try again in a moment.';
        this.toast.error(this.errorMessage);
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
