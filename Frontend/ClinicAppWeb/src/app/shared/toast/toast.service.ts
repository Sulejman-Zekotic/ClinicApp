import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastTone = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  title?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private itemsSubject = new BehaviorSubject<ToastItem[]>([]);
  private idCounter = 0;

  readonly items$ = this.itemsSubject.asObservable();

  success(message: string, title = 'Uspjesno'): void {
    this.push({ message, title, tone: 'success' });
  }

  error(message: string, title = 'Greska'): void {
    this.push({ message, title, tone: 'error' });
  }

  info(message: string, title = 'Info'): void {
    this.push({ message, title, tone: 'info' });
  }

  dismiss(id: number): void {
    this.itemsSubject.next(this.itemsSubject.value.filter((item) => item.id !== id));
  }

  private push(item: Omit<ToastItem, 'id'>): void {
    const toast: ToastItem = {
      id: ++this.idCounter,
      ...item
    };

    const items = [...this.itemsSubject.value, toast].slice(-4);
    this.itemsSubject.next(items);

    if (typeof window !== 'undefined') {
      window.setTimeout(() => this.dismiss(toast.id), 4200);
    }
  }
}
