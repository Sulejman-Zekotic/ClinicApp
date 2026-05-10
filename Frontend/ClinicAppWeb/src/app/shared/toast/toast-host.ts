import { AsyncPipe, NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [AsyncPipe, NgClass],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.scss'
})
export class ToastHostComponent {
  protected readonly toast = inject(ToastService);

  dismiss(id: number): void {
    this.toast.dismiss(id);
  }
}
