import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../navbar/navbar.component';
import { AppNotificationService, SocketService, NotificationService } from '../../services';
import { Notification, NotificationType } from '../../models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Notifications</h1>
          <p class="text-gray-600">Stay updated with your task activities</p>
        </div>
        @if (appNotificationService.notifications().length > 0) {
          <div class="flex gap-2">
            <button
              (click)="markAllAsRead()"
              class="btn bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm"
            >
              Mark all as read
            </button>
            <button
              (click)="clearAll()"
              class="btn bg-red-100 text-red-600 hover:bg-red-200 text-sm"
            >
              Clear all
            </button>
          </div>
        }
      </div>

      <div class="card">
        @if (appNotificationService.loading()) {
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-600">Loading notifications...</p>
          </div>
        } @else if (appNotificationService.notifications().length === 0) {
          <div class="text-center py-12">
            <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <p class="text-gray-500">No notifications yet</p>
            <p class="text-sm text-gray-400 mt-1">You'll see task updates and activities here</p>
          </div>
        } @else {
          <div class="divide-y divide-gray-200">
            @for (notification of appNotificationService.notifications(); track notification.id) {
              <div
                class="p-4 hover:bg-gray-50 transition-colors"
                [class.bg-blue-50]="!notification.read"
              >
                <div class="flex items-start gap-3">
                  <div [class]="getIconClass(notification.type)">
                    @switch (notification.type) {
                      @case ('task_created') {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      }
                      @case ('task_updated') {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      }
                      @case ('task_deleted') {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      }
                      @case ('task_assigned') {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                      }
                      @case ('task_due_soon') {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      }
                      @default {
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      }
                    }
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-gray-700">{{ notification.title }}</p>
                    <p class="text-gray-900" [class.font-medium]="!notification.read">
                      {{ notification.message }}
                    </p>
                    <div class="flex items-center gap-2 mt-1">
                      <p class="text-sm text-gray-500">
                        {{ notification.createdAt | date:'medium' }}
                      </p>
                      @if (notification.actor) {
                        <span class="text-sm text-gray-400">•</span>
                        <p class="text-sm text-gray-500">
                          by {{ notification.actor.username }}
                        </p>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (!notification.read) {
                      <button
                        (click)="markAsRead(notification)"
                        class="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Mark read
                      </button>
                    }
                    <button
                      (click)="removeNotification(notification)"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  constructor(
    public appNotificationService: AppNotificationService,
    private socketService: SocketService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    this.setupSocketListeners();
    this.socketService.connect();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  loadNotifications(): void {
    this.appNotificationService.loadNotifications().subscribe({
      error: (err) => {
        this.notificationService.error('Failed to load notifications');
        console.error('Load notifications error:', err);
      }
    });
  }

  setupSocketListeners(): void {
    const sub = this.socketService.notifications$.subscribe(data => {
      // When a new notification arrives via Socket.IO, add it to the list
      if (data.notification) {
        this.appNotificationService.addNotification(data.notification);
      }
    });
    this.subscriptions.push(sub);
  }

  markAsRead(notification: Notification): void {
    this.appNotificationService.markAsRead(notification.id).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to mark notification as read');
        console.error('Mark as read error:', err);
      }
    });
  }

  markAllAsRead(): void {
    this.appNotificationService.markAllAsRead().subscribe({
      next: () => this.notificationService.success('All notifications marked as read'),
      error: (err) => {
        this.notificationService.error('Failed to mark all as read');
        console.error('Mark all as read error:', err);
      }
    });
  }

  removeNotification(notification: Notification): void {
    this.appNotificationService.deleteNotification(notification.id).subscribe({
      error: (err) => {
        this.notificationService.error('Failed to delete notification');
        console.error('Delete notification error:', err);
      }
    });
  }

  clearAll(): void {
    if (confirm('Are you sure you want to clear all notifications?')) {
      this.appNotificationService.clearAll().subscribe({
        next: () => this.notificationService.success('All notifications cleared'),
        error: (err) => {
          this.notificationService.error('Failed to clear notifications');
          console.error('Clear all error:', err);
        }
      });
    }
  }

  getIconClass(type: NotificationType): string {
    const base = 'w-10 h-10 rounded-full flex items-center justify-center';
    switch (type) {
      case 'task_created':
        return `${base} bg-green-100 text-green-600`;
      case 'task_updated':
        return `${base} bg-blue-100 text-blue-600`;
      case 'task_deleted':
        return `${base} bg-red-100 text-red-600`;
      case 'task_assigned':
        return `${base} bg-purple-100 text-purple-600`;
      case 'task_due_soon':
        return `${base} bg-yellow-100 text-yellow-600`;
      default:
        return `${base} bg-gray-100 text-gray-600`;
    }
  }
}
