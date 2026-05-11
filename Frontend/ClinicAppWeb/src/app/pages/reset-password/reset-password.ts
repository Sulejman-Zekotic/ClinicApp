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
      this.errorMessage = 'Reset link nema sigurnosni token.';
      return;
    }

    if (!this.newPassword.trim()) {
      this.errorMessage = 'Unesi novu lozinku.';
      return;
    }

    if (this.newPassword.trim().length < 8) {
      this.errorMessage = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Potvrda lozinke se ne poklapa.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.confirmPasswordReset(this.token, this.newPassword).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Lozinka je uspjesno azurirana.');
        this.router.navigate(['/login']);
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message || 'Reset lozinke nije uspio. Zatrazi novi link i pokusaj ponovo.';
        this.toast.error(this.errorMessage);
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      }
    });
  }
}
