import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../services/auth';
import { LookupItem, LookupService } from '../../services/lookups';
import { MedicationHistoryRecord, MedicationHistoryService } from '../../services/medication-history';
import { Medication, MedicationsService } from '../../services/medications';
import { UserSummary, UsersService } from '../../services/users';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { PaginationComponent } from '../../shared/pagination/pagination';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    LucideDynamicIcon,
    LoadingSpinnerComponent,
    PaginationComponent
  ],
  templateUrl: './history.html',
  styleUrl: './history.scss'
})
export class HistoryComponent implements OnInit {
  private historyService = inject(MedicationHistoryService);
  private medicationsService = inject(MedicationsService);
  private usersService = inject(UsersService);
  private lookupService = inject(LookupService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private filterChanges = new Subject<void>();

  readonly isAdmin = this.auth.isAdmin();

  records: MedicationHistoryRecord[] = [];
  users: UserSummary[] = [];
  medications: Medication[] = [];
  reasonOptions: LookupItem[] = [];

  search = '';
  fromDate = '';
  toDate = '';
  selectedUserId: number | null = null;
  selectedMedicationId: number | null = null;
  selectedReasonId: number | null = null;
  page = 1;
  pageSize = 10;
  totalCount = 0;

  isLoading = false;
  errorMessage = '';
  selectedRecord: MedicationHistoryRecord | null = null;
  filtersOpen = false;

  get totalRecords(): number {
    return this.totalCount;
  }

  get todaysEntries(): number {
    const today = new Date().toISOString().slice(0, 10);
    return this.records.filter((record) => record.takenAt.slice(0, 10) === today).length;
  }

  get uniqueUsersCount(): number {
    return new Set(this.records.map((record) => record.username)).size;
  }

  ngOnInit(): void {
    this.setDefaultDates();

    this.filterChanges
      .pipe(debounceTime(260), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.loadHistory();
      });

    this.loadStaticOptions();

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const userId = params.get('userId');
      this.selectedUserId = userId ? Number(userId) : null;
      this.page = 1;
      this.loadHistory();
    });
  }

  loadStaticOptions(): void {
    this.medicationsService.getAll().subscribe({
      next: (medications) => {
        this.medications = medications;
      },
      error: () => {
        this.medications = [];
      }
    });

    this.lookupService.getMedicationTakeReasons().subscribe({
      next: (items) => {
        this.reasonOptions = items;
      },
      error: () => {
        this.reasonOptions = [];
      }
    });

    if (this.isAdmin) {
      this.usersService.getAll().subscribe({
        next: (users) => {
          this.users = users;
        },
        error: () => {
          this.users = [];
        }
      });
    }
  }

  queueFilterRefresh(): void {
    this.filterChanges.next();
  }

  loadHistory(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const selectedReason = this.reasonOptions.find((item) => item.id === this.selectedReasonId) ?? null;

    this.historyService
      .getPaged({
        page: this.page,
        pageSize: this.pageSize,
        search: this.search || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        userId: this.selectedUserId,
        medicationId: this.selectedMedicationId,
        reason: selectedReason?.name,
        medicationTakeReasonId: this.selectedReasonId
      })
      .subscribe({
        next: (result) => {
          this.records = result.items;
          this.totalCount = result.totalCount;
          this.page = result.page;
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Ucitavanje historije nije uspjelo.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  exportExcel(): void {
    const selectedReason = this.reasonOptions.find((item) => item.id === this.selectedReasonId) ?? null;

    this.historyService
      .exportExcel({
        search: this.search || undefined,
        fromDate: this.fromDate || undefined,
        toDate: this.toDate || undefined,
        userId: this.selectedUserId,
        medicationId: this.selectedMedicationId,
        reason: selectedReason?.name
      })
      .subscribe({
        next: (file) => this.downloadFile(file, 'historija-lijekova.xlsx'),
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Izvoz historije nije uspio.';
        }
      });
  }

  clearFilters(): void {
    this.search = '';
    this.selectedUserId = null;
    this.selectedMedicationId = null;
    this.selectedReasonId = null;
    this.setDefaultDates();
    this.page = 1;
    this.loadHistory();
  }

  openFilters(): void {
    this.filtersOpen = true;
  }

  closeFilters(): void {
    this.filtersOpen = false;
  }

  changePage(page: number): void {
    this.page = page;
    this.loadHistory();
  }

  openRecord(record: MedicationHistoryRecord): void {
    this.selectedRecord = record;
  }

  closeRecord(): void {
    this.selectedRecord = null;
  }

  recordReason(record: MedicationHistoryRecord): string {
    return record.reason || record.medicationTakeReasonName || '-';
  }

  private setDefaultDates(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    this.fromDate = this.formatDate(start);
    this.toDate = this.formatDate(end);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private downloadFile(file: Blob, filename: string): void {
    const url = window.URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }
}
