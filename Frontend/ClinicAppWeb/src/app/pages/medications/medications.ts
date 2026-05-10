import { CommonModule } from '@angular/common';
import { Component, DestroyRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon } from '@lucide/angular';
import { Subject, debounceTime } from 'rxjs';
import { AuthService } from '../../services/auth';
import { LookupItem, LookupService } from '../../services/lookups';
import { MedicationHistoryService } from '../../services/medication-history';
import {
  Medication,
  MedicationAlert,
  MedicationImportPreviewResult,
  MedicationImportResult,
  MedicationPayload,
  MedicationsService
} from '../../services/medications';
import { LoadingSpinnerComponent } from '../../shared/loading-spinner/loading-spinner';
import { PaginationComponent } from '../../shared/pagination/pagination';
import { ToastService } from '../../shared/toast/toast.service';

interface MedicationFormState {
  name: string;
  code: string;
  description: string;
  strength: string;
  stock: number;
  minimumStock: number;
  medicationCategoryId: number | null;
  medicationManufacturerId: number | null;
  medicationUnitId: number | null;
  requiresPrescription: boolean;
}

type MedicationPanelMode = 'form' | 'import' | 'take' | 'view' | 'filters' | 'delete' | null;

@Component({
  selector: 'app-medications',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideDynamicIcon,
    LoadingSpinnerComponent,
    PaginationComponent
  ],
  templateUrl: './medications.html',
  styleUrl: './medications.scss'
})
export class MedicationsComponent implements OnInit, OnDestroy {
  private medicationsService = inject(MedicationsService);
  private medicationHistoryService = inject(MedicationHistoryService);
  private lookupService = inject(LookupService);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);
  private toast = inject(ToastService);
  private filterChanges = new Subject<void>();

  readonly isAdmin = this.auth.isAdmin();

  isMobile = false;

  medications: Medication[] = [];
  alerts: MedicationAlert[] = [];
  categoryOptions: LookupItem[] = [];
  manufacturerOptions: LookupItem[] = [];
  unitOptions: LookupItem[] = [];
  takeReasonOptions: LookupItem[] = [];

  search = '';
  stockFilter = '';
  categoryId: number | null = null;
  manufacturerId: number | null = null;
  unitId: number | null = null;
  page = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 0;

  isLoading = false;
  isSavingMedication = false;
  isPreviewLoading = false;
  isImporting = false;
  isTakingMedication = false;
  detailLoading = false;

  deletingMedicationId: number | null = null;
  editingMedicationId: number | null = null;
  errorMessage = '';

  medicationForm: MedicationFormState = this.createMedicationForm();
  selectedMedicationDetails: Medication | null = null;
  activePanel: MedicationPanelMode = null;

  selectedImportFile: File | null = null;
  importPreview: MedicationImportPreviewResult | null = null;
  importResult: MedicationImportResult | null = null;

  takeMedicationTarget: Medication | null = null;
  pendingDeleteMedication: Medication | null = null;
  takeReasonId: number | null = null;
  takeReasonNote = '';
  takeQuantity = 1;

  get totalMedications(): number {
    return this.totalCount;
  }

  get inStockCount(): number {
    return Math.max(this.totalCount - this.lowSupplyCount - this.outOfStockCount, 0);
  }

  get lowSupplyCount(): number {
    return this.alerts.filter(
      (medication) => medication.stock > 0 && medication.stock <= medication.minimumStock
    ).length;
  }

  get outOfStockCount(): number {
    return this.alerts.filter((medication) => medication.stock === 0).length;
  }

  ngOnInit(): void {
    this.syncPageSize(false);

    this.filterChanges
      .pipe(debounceTime(260), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 1;
        this.loadMedications();
      });

    this.loadLookups();
    this.loadPage();
  }

  ngOnDestroy(): void {
    this.toggleToastState(false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.syncPageSize(true);
  }

  loadPage(): void {
    this.loadMedications();
    this.loadAlerts();
  }

  loadLookups(): void {
    this.lookupService.getMedicationCategories().subscribe({
      next: (items) => {
        this.categoryOptions = items;
      },
      error: () => {
        this.categoryOptions = [];
      }
    });

    this.lookupService.getMedicationManufacturers().subscribe({
      next: (items) => {
        this.manufacturerOptions = items;
      },
      error: () => {
        this.manufacturerOptions = [];
      }
    });

    this.lookupService.getMedicationUnits().subscribe({
      next: (items) => {
        this.unitOptions = items;
      },
      error: () => {
        this.unitOptions = [];
      }
    });

    this.lookupService.getMedicationTakeReasons().subscribe({
      next: (items) => {
        this.takeReasonOptions = items;
      },
      error: () => {
        this.takeReasonOptions = [];
      }
    });
  }

  loadMedications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.medicationsService
      .getPaged({
        page: this.page,
        pageSize: this.pageSize,
        search: this.search,
        stockFilter: this.stockFilter,
        categoryId: this.categoryId,
        manufacturerId: this.manufacturerId,
        unitId: this.unitId
      })
      .subscribe({
        next: (result) => {
          this.medications = result.items;
          this.totalCount = result.totalCount;
          this.totalPages = result.totalPages;
          this.page = result.page;

          if (this.totalPages > 0 && this.page > this.totalPages) {
            this.page = this.totalPages;
            this.loadMedications();
            return;
          }
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Greška pri učitavanju lijekova.';
          this.isLoading = false;
        },
        complete: () => {
          this.isLoading = false;
        }
      });
  }

  loadAlerts(): void {
    this.medicationsService.getAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
      },
      error: () => {
        this.alerts = [];
      }
    });
  }

  queueFilterRefresh(): void {
    this.filterChanges.next();
  }

  clearFilters(): void {
    this.search = '';
    this.stockFilter = '';
    this.categoryId = null;
    this.manufacturerId = null;
    this.unitId = null;
    this.page = 1;
    this.loadMedications();
  }

  changePage(page: number): void {
    if (page === this.page || page < 1 || page > this.totalPages) {
      return;
    }

    this.page = page;
    this.loadMedications();
  }

  openFiltersPanel(): void {
    this.clearMessages();
    this.setActivePanel('filters');
    this.selectedMedicationDetails = null;
    this.takeMedicationTarget = null;
    this.pendingDeleteMedication = null;
  }

  openCreateForm(): void {
    this.clearMessages();
    this.editingMedicationId = null;
    this.medicationForm = this.createMedicationForm();
    this.setActivePanel('form');
    this.selectedMedicationDetails = null;
    this.takeMedicationTarget = null;
    this.pendingDeleteMedication = null;
  }

  startEdit(medication: Medication): void {
    this.clearMessages();
    this.editingMedicationId = medication.id;
    this.medicationForm = {
      name: medication.name,
      code: medication.code,
      description: medication.description || '',
      strength: medication.strength || '',
      stock: medication.stock,
      minimumStock: medication.minimumStock,
      medicationCategoryId: medication.medicationCategoryId ?? null,
      medicationManufacturerId: medication.medicationManufacturerId ?? null,
      medicationUnitId: medication.medicationUnitId ?? null,
      requiresPrescription: medication.requiresPrescription
    };
    this.setActivePanel('form');
    this.selectedMedicationDetails = null;
    this.takeMedicationTarget = null;
    this.pendingDeleteMedication = null;
  }

  closePanel(): void {
    this.clearMessages();
    this.setActivePanel(null);
    this.editingMedicationId = null;
    this.selectedMedicationDetails = null;
    this.detailLoading = false;
    this.takeMedicationTarget = null;
    this.pendingDeleteMedication = null;
    this.takeReasonId = null;
    this.takeReasonNote = '';
    this.takeQuantity = 1;
    this.selectedImportFile = null;
    this.importPreview = null;
    this.importResult = null;
  }

  submitMedication(): void {
    if (this.isSavingMedication) {
      return;
    }

    this.clearMessages();
    this.isSavingMedication = true;

    const selectedCategory = this.getLookupById(
      this.categoryOptions,
      this.medicationForm.medicationCategoryId
    );
    const selectedManufacturer = this.getLookupById(
      this.manufacturerOptions,
      this.medicationForm.medicationManufacturerId
    );
    const selectedUnit = this.getLookupById(this.unitOptions, this.medicationForm.medicationUnitId);

    const payload: MedicationPayload = {
      name: this.medicationForm.name,
      code: this.medicationForm.code,
      description: this.medicationForm.description || null,
      manufacturer: selectedManufacturer?.name || null,
      medicationManufacturerId: this.medicationForm.medicationManufacturerId,
      strength: this.medicationForm.strength || null,
      unit: selectedUnit?.symbol || selectedUnit?.name || null,
      stock: this.medicationForm.stock,
      minimumStock: this.medicationForm.minimumStock,
      category: selectedCategory?.name || null,
      requiresPrescription: this.medicationForm.requiresPrescription,
      medicationCategoryId: this.medicationForm.medicationCategoryId,
      medicationUnitId: this.medicationForm.medicationUnitId
    };

    const request = this.editingMedicationId
      ? this.medicationsService.update(this.editingMedicationId, payload)
      : this.medicationsService.add(payload);

    request.subscribe({
      next: () => {
        this.toast.success(
          this.editingMedicationId ? 'Lijek je sačuvan.' : 'Lijek je dodan.',
          this.editingMedicationId ? 'Sačuvano' : 'Dodano'
        );
        this.closePanel();
        this.loadPage();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Spremanje lijeka nije uspjelo.';
        this.isSavingMedication = false;
      },
      complete: () => {
        this.isSavingMedication = false;
      }
    });
  }

  viewDetails(id: number): void {
    this.clearMessages();
    this.setActivePanel('view');
    this.detailLoading = true;
    this.selectedMedicationDetails = null;

    this.medicationsService.getById(id).subscribe({
      next: (medication) => {
        this.selectedMedicationDetails = medication;
      },
      error: () => {
        this.selectedMedicationDetails = null;
        this.errorMessage = 'Detalji lijeka nisu dostupni.';
      },
      complete: () => {
        this.detailLoading = false;
      }
    });
  }

  deleteMedication(medication: Medication): void {
    this.clearMessages();
    this.pendingDeleteMedication = medication;
    this.selectedMedicationDetails = null;
    this.takeMedicationTarget = null;
    this.setActivePanel('delete');
  }

  confirmDeleteMedication(): void {
    if (!this.pendingDeleteMedication || this.deletingMedicationId) {
      return;
    }

    const medication = this.pendingDeleteMedication;
    this.clearMessages();
    this.deletingMedicationId = medication.id;

    this.medicationsService.delete(medication.id).subscribe({
      next: (response) => {
        this.toast.success(response.message || 'Lijek je obrisan.', 'Obrisano');
        this.closePanel();
        this.loadPage();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Brisanje lijeka nije uspjelo.';
      },
      complete: () => {
        this.deletingMedicationId = null;
      }
    });
  }

  openImportPanel(): void {
    this.clearMessages();
    this.selectedImportFile = null;
    this.importPreview = null;
    this.importResult = null;
    this.setActivePanel('import');
  }

  exportExcel(): void {
    this.medicationsService.exportExcel(this.search, this.stockFilter).subscribe({
      next: (file) => this.downloadFile(file, 'lijekovi.xlsx'),
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Izvoz Excel fajla nije uspio.';
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedImportFile = input.files?.[0] ?? null;
    this.importPreview = null;
    this.importResult = null;
  }

  previewImport(): void {
    if (!this.selectedImportFile) {
      this.errorMessage = 'Odaberi Excel fajl.';
      return;
    }

    this.clearMessages();
    this.isPreviewLoading = true;

    this.medicationsService.previewImport(this.selectedImportFile).subscribe({
      next: (preview) => {
        this.importPreview = preview;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Pregled importa nije uspio.';
        this.isPreviewLoading = false;
      },
      complete: () => {
        this.isPreviewLoading = false;
      }
    });
  }

  importExcel(): void {
    if (!this.selectedImportFile) {
      this.errorMessage = 'Odaberi Excel fajl.';
      return;
    }

    this.clearMessages();
    this.isImporting = true;

    this.medicationsService.importExcel(this.selectedImportFile).subscribe({
      next: (result) => {
        this.importResult = result;
        this.toast.success('Excel fajl je uspješno uvezen.', 'Uvoz');
        this.loadPage();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Excel import nije uspio.';
        this.isImporting = false;
      },
      complete: () => {
        this.isImporting = false;
      }
    });
  }

  startTakeMedication(medication: Medication): void {
    this.clearMessages();
    this.takeMedicationTarget = medication;
    this.takeReasonId = null;
    this.takeReasonNote = '';
    this.takeQuantity = 1;
    this.setActivePanel('take');
  }

  submitTakeMedication(): void {
    if (!this.takeMedicationTarget || this.isTakingMedication) {
      return;
    }

    const selectedReason = this.getLookupById(this.takeReasonOptions, this.takeReasonId);
    const trimmedNote = this.takeReasonNote.trim();
    const reason = selectedReason?.name || trimmedNote;

    if (!reason) {
      this.errorMessage = 'Odaberi razlog ili unesi napomenu.';
      return;
    }

    this.clearMessages();
    this.isTakingMedication = true;

    const reasonText =
      selectedReason && trimmedNote
        ? `${selectedReason.name}: ${trimmedNote}`
        : trimmedNote || null;

    this.medicationHistoryService
      .takeMedication({
        medicationId: this.takeMedicationTarget.id,
        reason,
        quantity: this.takeQuantity,
        medicationTakeReasonId: selectedReason?.id ?? null,
        reasonText
      })
      .subscribe({
        next: () => {
          this.toast.success('Izdavanje je evidentirano.', 'Sačuvano');
          this.closePanel();
          this.loadPage();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Evidentiranje nije uspjelo.';
          this.isTakingMedication = false;
        },
        complete: () => {
          this.isTakingMedication = false;
        }
      });
  }

  getStockStatusClass(medication: Medication): string {
    if (medication.stock === 0) {
      return 'status-chip status-chip--danger';
    }

    if (medication.stock <= medication.minimumStock) {
      return 'status-chip status-chip--warn';
    }

    return 'status-chip status-chip--good';
  }

  getStockStatus(medication: Medication): string {
    if (medication.stock === 0) {
      return 'Nema na stanju';
    }

    if (medication.stock <= medication.minimumStock) {
      return 'Pri kraju';
    }

    return 'Na stanju';
  }

  lookupLabel(item: LookupItem): string {
    return item.symbol ? `${item.name} (${item.symbol})` : item.name;
  }

  private syncPageSize(reload: boolean): void {
    if (typeof window === 'undefined') {
      return;
    }

    const nextIsMobile = window.innerWidth <= 760;
    const nextPageSize = 5;

    const mobileChanged = this.isMobile !== nextIsMobile;
    const pageSizeChanged = this.pageSize !== nextPageSize;

    this.isMobile = nextIsMobile;

    if (!pageSizeChanged && !mobileChanged) {
      return;
    }

    this.pageSize = nextPageSize;
    this.page = 1;

    if (reload) {
      this.loadMedications();
    }
  }

  private setActivePanel(panel: MedicationPanelMode): void {
    this.activePanel = panel;
    this.toggleToastState(panel !== null);
  }

  private toggleToastState(isOpen: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('workspace-toast-open', isOpen);
  }

  private getLookupById(items: LookupItem[], id: number | null): LookupItem | null {
    return items.find((item) => item.id === id) ?? null;
  }

  private clearMessages(): void {
    this.errorMessage = '';
  }

  private createMedicationForm(): MedicationFormState {
    return {
      name: '',
      code: '',
      description: '',
      strength: '',
      stock: 5,
      minimumStock: 5,
      medicationCategoryId: null,
      medicationManufacturerId: null,
      medicationUnitId: null,
      requiresPrescription: false
    };
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