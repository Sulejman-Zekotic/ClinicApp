import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Router } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../services/auth';
import { AddUserRequest, UserSummary, UsersService } from '../../services/users';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { ToastService } from '../../shared/toast/toast.service';

type UsersPanelMode = 'form' | 'credentials' | null;

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideDynamicIcon, LoadingSpinnerComponent, PaginationComponent],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class UsersComponent implements OnInit {
  private usersService = inject(UsersService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);
  private filterChanges = new Subject<void>();

  readonly isAdmin = this.auth.isAdmin();

  users: UserSummary[] = [];
  generatedCredential: { username: string; password: string; email?: string | null } | null = null;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  formSubmitted = false;
  search = '';
  roleFilter = '';
  page = 1;
  pageSize = 10;
  totalCount = 0;
  activePanel: UsersPanelMode = null;

  form: AddUserRequest = {
    username: '',
    email: '',
    role: 'user'
  };

  get adminCount(): number {
    return this.users.filter((user) => user.role.toLowerCase() === 'admin').length;
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      return;
    }

    this.filterChanges
      .pipe(debounceTime(260), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.loadUsers();
      });

    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.usersService
      .getPaged({
        page: this.page,
        pageSize: this.pageSize,
        search: this.search,
        role: this.roleFilter
      })
      .subscribe({
        next: (result) => {
          this.users = result.items;
          this.totalCount = result.totalCount;
          this.page = result.page;
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Ucitavanje korisnika nije uspjelo.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  queueFilterRefresh(): void {
    this.filterChanges.next();
  }

  clearFilters(): void {
    this.search = '';
    this.roleFilter = '';
    this.page = 1;
    this.loadUsers();
  }

  changePage(page: number): void {
    this.page = page;
    this.loadUsers();
  }

  openCreatePanel(): void {
    this.errorMessage = '';
    this.formSubmitted = false;
    this.form = {
      username: '',
      email: '',
      role: 'user'
    };
    this.activePanel = 'form';
  }

  closePanel(): void {
    this.errorMessage = '';
    this.formSubmitted = false;
    this.activePanel = null;
    this.generatedCredential = null;
  }

  submit(): void {
    if (this.isSaving) {
      return;
    }

    this.errorMessage = '';
    this.formSubmitted = true;

    this.form = {
      ...this.form,
      username: this.form.username.trim(),
      email: this.form.email.trim(),
      role: this.form.role.trim().toLowerCase()
    };

    const formError = this.getFormError();
    if (formError) {
      this.errorMessage = formError;
      return;
    }

    this.isSaving = true;

    this.usersService.add(this.form).subscribe({
      next: (user) => {
        this.generatedCredential = {
          username: user.username,
          email: user.email,
          password: user.temporaryPassword
        };
        this.toast.success(`Korisnik ${user.username} je dodat.`);
        this.activePanel = 'credentials';
        this.loadUsers();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Dodavanje korisnika nije uspjelo.';
        this.toast.error(this.errorMessage);
        this.isSaving = false;
      },
      complete: () => {
        this.isSaving = false;
      }
    });
  }

  openHistory(user: UserSummary): void {
    this.router.navigate(['/history'], {
      queryParams: {
        userId: user.id
      }
    });
  }

  copyPassword(password: string): void {
    navigator.clipboard?.writeText(password);
    this.toast.info('Lozinka je kopirana.', 'Kopirano');
  }

  initials(username: string): string {
    return username.slice(0, 1).toUpperCase();
  }

  getRoleClass(role: string): string {
    const normalized = role.toLowerCase();

    if (normalized === 'admin') {
      return 'status-chip status-chip--warn';
    }

    return 'status-chip status-chip--good';
  }

  roleLabel(role: string): string {
    return role.toLowerCase() === 'admin' ? 'Admin' : 'Korisnik';
  }

  showFieldError(field: keyof AddUserRequest): boolean {
    return this.formSubmitted && !!this.getFieldError(field);
  }

  getFieldError(field: keyof AddUserRequest): string {
    const username = this.form.username.trim();
    const email = this.form.email.trim();
    const role = this.form.role.trim().toLowerCase();

    switch (field) {
      case 'username':
        if (!username) {
          return 'Unesi korisnicko ime.';
        }

        if (username.length < 2) {
          return 'Korisnicko ime mora imati najmanje 2 znaka.';
        }

        if (username.length > 60) {
          return 'Korisnicko ime moze imati najvise 60 znakova.';
        }

        return '';
      case 'email':
        if (!email) {
          return 'Unesi email adresu.';
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return 'Unesi ispravnu email adresu.';
        }

        return '';
      case 'role':
        return role === 'admin' || role === 'user' ? '' : 'Odaberi ulogu.';
      default:
        return '';
    }
  }

  private getFormError(): string {
    const fields: Array<keyof AddUserRequest> = ['username', 'email', 'role'];
    return fields.map((field) => this.getFieldError(field)).find((message) => !!message) ?? '';
  }
}
