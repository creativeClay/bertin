import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NotificationToastComponent],
  template: `
    <app-notification-toast></app-notification-toast>
    <router-outlet></router-outlet>
  `
})
export class AppComponent {}
