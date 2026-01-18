import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AppNotificationService {
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  private notificationsSignal = signal<Notification[]>([]);
  private unreadCountSignal = signal<number>(0);
  private loadingSignal = signal<boolean>(false);

  readonly notifications = this.notificationsSignal.asReadonly();
  readonly unreadCount = this.unreadCountSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadNotifications(unreadOnly: boolean = false): Observable<{ notifications: Notification[] }> {
    this.loadingSignal.set(true);
    const params = unreadOnly ? '?unread_only=true' : '';

    return this.http.get<{ notifications: Notification[] }>(`${this.apiUrl}${params}`).pipe(
      tap(response => {
        this.notificationsSignal.set(response.notifications);
        this.loadingSignal.set(false);
      })
    );
  }

  loadUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => {
        this.unreadCountSignal.set(response.count);
      })
    );
  }

  markAsRead(id: number): Observable<{ notification: Notification }> {
    return this.http.put<{ notification: Notification }>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(response => {
        this.notificationsSignal.update(notifications =>
          notifications.map(n => n.id === id ? { ...n, read: true } : n)
        );
        this.unreadCountSignal.update(count => Math.max(0, count - 1));
      })
    );
  }

  markAllAsRead(): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => {
        this.notificationsSignal.update(notifications =>
          notifications.map(n => ({ ...n, read: true }))
        );
        this.unreadCountSignal.set(0);
      })
    );
  }

  deleteNotification(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const notification = this.notificationsSignal().find(n => n.id === id);
        this.notificationsSignal.update(notifications =>
          notifications.filter(n => n.id !== id)
        );
        if (notification && !notification.read) {
          this.unreadCountSignal.update(count => Math.max(0, count - 1));
        }
      })
    );
  }

  clearAll(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/clear`).pipe(
      tap(() => {
        this.notificationsSignal.set([]);
        this.unreadCountSignal.set(0);
      })
    );
  }

  // Called when a new notification arrives via Socket.IO
  addNotification(notification: Notification): void {
    this.notificationsSignal.update(notifications => [notification, ...notifications]);
    if (!notification.read) {
      this.unreadCountSignal.update(count => count + 1);
    }
  }
}
