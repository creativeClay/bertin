import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="bg-white shadow-lg">
      <div class="max-w-7xl mx-auto px-4">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-8">
            <a routerLink="/dashboard" class="text-xl font-bold text-blue-600">
              TaskManager
            </a>

            @if (authService.isAuthenticated()) {
              <div class="hidden md:flex space-x-4">
                <a
                  routerLink="/dashboard"
                  routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                  class="px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </a>
                <a
                  routerLink="/team"
                  routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                  class="px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Team
                </a>
              </div>
            }
          </div>

          @if (authService.isAuthenticated()) {
            <div class="flex items-center space-x-4">
              <div class="text-right hidden sm:block">
                <p class="text-sm font-medium text-gray-900">
                  {{ authService.currentUser()?.username }}
                </p>
                <p class="text-xs text-gray-500">
                  {{ authService.currentUser()?.role === 'admin' ? 'Admin' : 'Member' }}
                </p>
              </div>
              <button
                (click)="authService.logout()"
                class="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </div>
          }
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  constructor(public authService: AuthService) {}
}
