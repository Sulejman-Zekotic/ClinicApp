import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, MeResponse } from '../../services/auth';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './account.html',
  styleUrl: './account.scss'
})
export class AccountComponent implements OnInit {
  protected auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  profile: MeResponse | null = null;
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  forcedPasswordChange = false;

  ngOnInit(): void {
    this.forcedPasswordChange =
      this.route.snapshot.queryParamMap.get('forced') === '1' || this.auth.getMustChangePassword();

    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.auth.me().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.forcedPasswordChange = this.forcedPasswordChange || profile.mustChangePassword;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Detalji naloga nisu ucitani.';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    if (this.isSaving) {
      return;
    }

    if (!this.currentPassword.trim() || !this.newPassword.trim()) {
      this.errorMessage = 'Unesi trenutnu i novu lozinku.';
      return;
    }

    if (this.newPassword.trim().length < 8) {
      this.errorMessage = 'Nova lozinka mora imati najmanje 8 znakova.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Potvrda lozinke se ne poklapa.';
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    this.auth
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword
      })
      .subscribe({
        next: (response) => {
          this.currentPassword = '';
          this.newPassword = '';
          this.confirmPassword = '';
          this.auth.setMustChangePassword(false);
          this.forcedPasswordChange = false;
          this.toast.success(response.message || 'Lozinka je uspjesno promijenjena.');
          this.loadProfile();
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message || 'Promjena lozinke nije uspjela. Provjeri trenutnu lozinku.';
          this.toast.error(this.errorMessage);
        },
        complete: () => {
          this.isSaving = false;
        }
      });
  }
}
