import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, AuthService, NotificationService } from '../../services';
import { NavbarComponent } from '../navbar/navbar.component';
import { User, Invite } from '../../models';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">Team Management</h1>
          <p class="text-gray-600">{{ organizationService.organization()?.name }}</p>
        </div>
      </div>

      <!-- Invite Member Section (Admin only) -->
      @if (authService.isAdmin()) {
        <div class="card mb-6">
          <h2 class="text-lg font-semibold mb-4">Invite New Member</h2>
          <div class="flex gap-4">
            <input
              type="email"
              [(ngModel)]="inviteEmail"
              class="input flex-1"
              placeholder="Enter email address"
            />
            <button
              (click)="sendInvite()"
              [disabled]="!inviteEmail || sendingInvite"
              class="btn btn-primary"
            >
              {{ sendingInvite ? 'Sending...' : 'Send Invite' }}
            </button>
          </div>
        </div>
      }

      <!-- Pending Invites (Admin only) -->
      @if (authService.isAdmin() && organizationService.invites().length > 0) {
        <div class="card mb-6">
          <h2 class="text-lg font-semibold mb-4">Pending Invites</h2>
          <div class="space-y-3">
            @for (invite of organizationService.invites(); track invite.id) {
              @if (!invite.accepted) {
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p class="font-medium">{{ invite.email }}</p>
                    <p class="text-sm text-gray-500">
                      Invited {{ invite.createdAt | date:'mediumDate' }}
                      · Expires {{ invite.expires_at | date:'mediumDate' }}
                    </p>
                  </div>
                  <div class="relative">
                    <button
                      (click)="toggleInviteMenu(invite.id)"
                      class="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                      </svg>
                    </button>
                    @if (openInviteMenuId === invite.id) {
                      <div class="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          (click)="resendInvite(invite); closeInviteMenu()"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            Resend
                          </span>
                        </button>
                        <button
                          (click)="cancelInvite(invite); closeInviteMenu()"
                          class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                        >
                          <span class="flex items-center">
                            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                            Cancel
                          </span>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- Team Members -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">Team Members</h2>

        @if (organizationService.loading()) {
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  @if (authService.isAdmin()) {
                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                @for (member of organizationService.members(); track member.id) {
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-4">
                      <div class="font-medium text-gray-900">{{ member.username }}</div>
                      <div class="text-sm text-gray-500">{{ member.email }}</div>
                    </td>
                    <td class="px-4 py-4">
                      <span [class]="getRoleBadgeClass(member.role)">
                        {{ member.role }}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-sm text-gray-600">
                      {{ member.createdAt | date:'mediumDate' }}
                    </td>
                    @if (authService.isAdmin()) {
                      <td class="px-4 py-4 text-right">
                        @if (member.id !== authService.currentUser()?.id) {
                          <div class="relative inline-block">
                            <button
                              (click)="toggleMemberMenu(member.id)"
                              class="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <svg class="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                              </svg>
                            </button>
                            @if (openMemberMenuId === member.id) {
                              <div class="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                @if (member.role === 'member') {
                                  <button
                                    (click)="updateRole(member, 'admin'); closeMemberMenu()"
                                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <span class="flex items-center">
                                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                                      </svg>
                                      Make Admin
                                    </span>
                                  </button>
                                } @else {
                                  <button
                                    (click)="updateRole(member, 'member'); closeMemberMenu()"
                                    class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                  >
                                    <span class="flex items-center">
                                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                                      </svg>
                                      Remove Admin
                                    </span>
                                  </button>
                                }
                                <button
                                  (click)="removeMember(member); closeMemberMenu()"
                                  class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                  <span class="flex items-center">
                                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                    Remove
                                  </span>
                                </button>
                              </div>
                            }
                          </div>
                        } @else {
                          <span class="text-gray-400 text-sm">You</span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `
})
export class TeamComponent implements OnInit {
  inviteEmail = '';
  sendingInvite = false;
  openMemberMenuId: number | null = null;
  openInviteMenuId: number | null = null;

  constructor(
    public organizationService: OrganizationService,
    public authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.organizationService.loadOrganization().subscribe();
    this.organizationService.loadMembers().subscribe();
    if (this.authService.isAdmin()) {
      this.organizationService.loadInvites().subscribe();
    }
  }

  sendInvite(): void {
    if (!this.inviteEmail) return;

    this.sendingInvite = true;
    this.organizationService.createInvite(this.inviteEmail).subscribe({
      next: () => {
        this.notificationService.success('Invite sent successfully');
        this.inviteEmail = '';
        this.sendingInvite = false;
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to send invite');
        this.sendingInvite = false;
      }
    });
  }

  cancelInvite(invite: Invite): void {
    if (confirm('Are you sure you want to cancel this invite?')) {
      this.organizationService.cancelInvite(invite.id).subscribe({
        next: () => this.notificationService.success('Invite cancelled'),
        error: (err) => this.notificationService.error(err.error?.error || 'Failed to cancel invite')
      });
    }
  }

  resendInvite(invite: Invite): void {
    this.organizationService.resendInvite(invite.id).subscribe({
      next: () => {
        this.notificationService.success('Invite resent successfully');
        this.organizationService.loadInvites().subscribe();
      },
      error: (err) => this.notificationService.error(err.error?.error || 'Failed to resend invite')
    });
  }

  updateRole(member: User, role: 'admin' | 'member'): void {
    this.organizationService.updateMemberRole(member.id, role).subscribe({
      next: () => this.notificationService.success(`${member.username} is now ${role === 'admin' ? 'an admin' : 'a member'}`),
      error: (err) => this.notificationService.error(err.error?.error || 'Failed to update role')
    });
  }

  removeMember(member: User): void {
    if (confirm(`Are you sure you want to remove ${member.username} from the team?`)) {
      this.organizationService.removeMember(member.id).subscribe({
        next: () => this.notificationService.success(`${member.username} has been removed`),
        error: (err) => this.notificationService.error(err.error?.error || 'Failed to remove member')
      });
    }
  }

  getRoleBadgeClass(role: string): string {
    return role === 'admin'
      ? 'badge bg-purple-100 text-purple-800'
      : 'badge bg-gray-100 text-gray-800';
  }

  toggleMemberMenu(memberId: number): void {
    this.openMemberMenuId = this.openMemberMenuId === memberId ? null : memberId;
    this.openInviteMenuId = null;
  }

  closeMemberMenu(): void {
    this.openMemberMenuId = null;
  }

  toggleInviteMenu(inviteId: number): void {
    this.openInviteMenuId = this.openInviteMenuId === inviteId ? null : inviteId;
    this.openMemberMenuId = null;
  }

  closeInviteMenu(): void {
    this.openInviteMenuId = null;
  }
}
