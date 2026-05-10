import { AsyncPipe, NgClass } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { ConfirmDialogService } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog-host',
  standalone: true,
  imports: [AsyncPipe, NgClass],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.scss'
})
export class ConfirmDialogHostComponent {
  protected dialog = inject(ConfirmDialogService);

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.dialog.cancel();
  }

  cancel(): void {
    this.dialog.cancel();
  }

  confirm(): void {
    this.dialog.confirm();
  }
}
