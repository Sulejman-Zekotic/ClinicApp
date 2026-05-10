import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss'
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() totalCount = 0;
  @Input() alwaysShow = false;
  @Output() pageChange = new EventEmitter<number>();

  get totalPages(): number {
    if (this.pageSize <= 0) {
      return 0;
    }

    return Math.max(0, Math.ceil(this.totalCount / this.pageSize));
  }

  get startItem(): number {
    if (!this.totalCount) {
      return 0;
    }

    return (this.page - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    if (!this.totalCount) {
      return 0;
    }

    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get visiblePages(): number[] {
    const totalPages = this.totalPages;

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    let start = Math.max(1, this.page - 2);
    let end = Math.min(totalPages, start + 4);

    start = Math.max(1, end - 4);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  get compactPages(): number[] {
    const totalPages = this.totalPages;

    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set<number>();
    pages.add(this.page);

    if (this.page > 1) {
      pages.add(this.page - 1);
    }

    if (this.page < totalPages) {
      pages.add(this.page + 1);
    }

    return Array.from(pages).sort((left, right) => left - right);
  }

  get showJumpToFirst(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[0] > 1;
  }

  get showJumpToLast(): boolean {
    return this.visiblePages.length > 0 && this.visiblePages[this.visiblePages.length - 1] < this.totalPages;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.page) {
      return;
    }

    this.pageChange.emit(page);
  }
}
