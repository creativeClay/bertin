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
                <a
                  routerLink="/notifications"
                  routerLinkActive="text-blue-600 border-b-2 border-blue-600"
                  class="px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Notifications
                </a>
              </div>
            }
          </div>

          @if (authService.isAuthenticated()) {
            <div class="flex items-center space-x-4">
              <!-- Profile Dropdown -->
              <div class="relative">
                <button
                  (click)="toggleDropdown()"
                  class="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                    {{ authService.currentUser()?.username?.charAt(0)?.toUpperCase() }}
                  </div>
                  <div class="text-left hidden sm:block">
                    <p class="text-sm font-medium text-gray-900">
                      {{ authService.currentUser()?.username }}
                    </p>
                    <p class="text-xs text-gray-500">
                      {{ authService.currentUser()?.role === 'admin' ? 'Admin' : 'Member' }}
                    </p>
                  </div>
                  <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                @if (showDropdown) {
                  <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div class="px-4 py-2 border-b border-gray-100">
                      <p class="text-sm font-medium text-gray-900">{{ authService.currentUser()?.username }}</p>
                      <p class="text-xs text-gray-500">{{ authService.currentUser()?.email }}</p>
                    </div>
                    <a
                      routerLink="/dashboard"
                      (click)="closeDropdown()"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
                        </svg>
                        Tasks
                      </span>
                    </a>
                    <a
                      routerLink="/team"
                      (click)="closeDropdown()"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                        </svg>
                        Team
                      </span>
                    </a>
                    <a
                      routerLink="/notifications"
                      (click)="closeDropdown()"
                      class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                        </svg>
                        Notifications
                      </span>
                    </a>
                    <div class="border-t border-gray-100 mt-1">
                      <button
                        (click)="logout()"
                        class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        <span class="flex items-center">
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                          </svg>
                          Logout
                        </span>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </nav>

    <!-- Backdrop for closing dropdown -->
    @if (showDropdown) {
      <div (click)="closeDropdown()" class="fixed inset-0 z-40"></div>
    }
  `
})
export class NavbarComponent {
  showDropdown = false;

  constructor(public authService: AuthService) {}

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
  }
}
