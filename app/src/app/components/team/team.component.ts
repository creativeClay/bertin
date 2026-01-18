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
                  <div class="flex gap-3">
                    <button
                      (click)="resendInvite(invite)"
                      class="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Resend
                    </button>
                    <button
                      (click)="cancelInvite(invite)"
                      class="text-red-600 hover:text-red-800 text-sm"
                    >
                      Cancel
                    </button>
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
                      <td class="px-4 py-4 text-right space-x-2">
                        @if (member.id !== authService.currentUser()?.id) {
                          @if (member.role === 'member') {
                            <button
                              (click)="updateRole(member, 'admin')"
                              class="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Make Admin
                            </button>
                          } @else {
                            <button
                              (click)="updateRole(member, 'member')"
                              class="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Remove Admin
                            </button>
                          }
                          <button
                            (click)="removeMember(member)"
                            class="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
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
}
