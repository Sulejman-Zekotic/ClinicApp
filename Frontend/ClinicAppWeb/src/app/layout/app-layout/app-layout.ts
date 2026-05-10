import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';
import { filter } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ConfirmDialogHostComponent } from '../../shared/confirm-dialog/confirm-dialog';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  adminOnly?: boolean;
  hidden?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideDynamicIcon, ConfirmDialogHostComponent],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.scss'
})
export class AppLayoutComponent implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  readonly username = this.auth.getUsername() || 'Korisnik';
  readonly role = this.auth.getRole() || 'user';
  readonly isAdmin = this.auth.isAdmin();

  mobileNavOpen = false;

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Medications', path: '/medications', icon: 'pill' },
    { label: 'History', path: '/history', icon: 'history' },
    { label: 'Users', path: '/users', icon: 'users', adminOnly: true },
    { label: 'Analytics', path: '/analytics', icon: 'chart-column-big' },
    { label: 'Notifications', path: '/notifications', icon: 'bell', hidden: true },
    { label: 'Account', path: '/account', icon: 'key-round', hidden: true }
  ];

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter((item) => !item.hidden && (!item.adminOnly || this.isAdmin));
  }

  get roleLabel(): string {
    return this.isAdmin ? 'Super Admin' : 'Staff User';
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.mobileNavOpen = false;
      });
  }

  toggleMobileNav(): void {
    this.mobileNavOpen = !this.mobileNavOpen;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.auth.clearSession();
        this.router.navigateByUrl('/login');
      }
    });
  }
}