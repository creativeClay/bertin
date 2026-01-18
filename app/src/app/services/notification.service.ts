import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationsSignal = signal<Notification[]>([]);
  private nextId = 1;

  readonly notifications = this.notificationsSignal.asReadonly();

  show(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification: Notification = {
      id: this.nextId++,
      message,
      type,
      timestamp: new Date()
    };

    this.notificationsSignal.update(notifications => [...notifications, notification]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      this.remove(notification.id);
    }, 5000);
  }

  remove(id: number): void {
    this.notificationsSignal.update(notifications =>
      notifications.filter(n => n.id !== id)
    );
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }
}
