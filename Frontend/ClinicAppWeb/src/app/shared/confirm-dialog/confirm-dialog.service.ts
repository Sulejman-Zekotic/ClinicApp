import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ConfirmDialogTone = 'primary' | 'danger';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmDialogTone;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmDialogTone;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private stateSubject = new BehaviorSubject<ConfirmDialogState | null>(null);
  private resolver: ((value: boolean) => void) | null = null;

  get state$(): Observable<ConfirmDialogState | null> {
    return this.stateSubject.asObservable();
  }

  async open(options: ConfirmDialogOptions): Promise<boolean> {
    if (this.resolver) {
      this.resolver(false);
      this.resolver = null;
    }

    this.stateSubject.next({
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel || 'Potvrdi',
      cancelLabel: options.cancelLabel || 'Otkazi',
      tone: options.tone || 'primary'
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    this.close(true);
  }

  cancel(): void {
    this.close(false);
  }

  private close(result: boolean): void {
    this.resolver?.(result);
    this.resolver = null;
    this.stateSubject.next(null);
  }
}
