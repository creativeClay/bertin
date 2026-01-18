import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-50 space-y-2">
      @for (notification of notificationService.notifications(); track notification.id) {
        <div
          class="px-4 py-3 rounded-lg shadow-lg flex items-center justify-between min-w-[300px] animate-slide-in"
          [ngClass]="{
            'bg-green-500 text-white': notification.type === 'success',
            'bg-red-500 text-white': notification.type === 'error',
            'bg-blue-500 text-white': notification.type === 'info'
          }"
        >
          <span>{{ notification.message }}</span>
          <button
            (click)="notificationService.remove(notification.id)"
            class="ml-4 hover:opacity-75"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    @keyframes slide-in {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    .animate-slide-in {
      animation: slide-in 0.3s ease-out;
    }
  `]
})
export class NotificationToastComponent {
  constructor(public notificationService: NotificationService) {}
}
