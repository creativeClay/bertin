import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrganizationService, AuthService, NotificationService } from '../../services';
import { NavbarComponent } from '../navbar/navbar.component';
import { User, Invite } from '../../models';

type TabType = 'members' | 'invites';

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

      <!-- Tabs -->
      <div class="mb-6 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            (click)="activeTab = 'members'"
            [class]="getTabClass('members')"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
            Users
            <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
              {{ organizationService.members().length }}
            </span>
          </button>
          @if (authService.isAdmin()) {
            <button
              (click)="activeTab = 'invites'"
              [class]="getTabClass('invites')"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              Invites
              @if (pendingInvitesCount() > 0) {
                <span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">
                  {{ pendingInvitesCount() }}
                </span>
              }
            </button>
          }
        </nav>
      </div>

      <!-- Members Tab -->
      @if (activeTab === 'members') {
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
                        <div class="flex items-center">
                          <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-3">
                            {{ getMemberInitials(member) }}
                          </div>
                          <div>
                            <div class="font-medium text-gray-900">{{ getMemberFullName(member) }}</div>
                            <div class="text-sm text-gray-500">{{ member.email }}</div>
                          </div>
                        </div>
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
      }

      <!-- Invites Tab -->
      @if (activeTab === 'invites' && authService.isAdmin()) {
        <!-- Invite Member Section -->
        <div class="card mb-6">
          <h2 class="text-lg font-semibold mb-4">Invite New Member</h2>
          <div class="flex gap-4 mb-4">
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

          <!-- Bulk Import Section -->
          <div class="border-t border-gray-200 pt-4 mt-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Or invite multiple users at once</h3>
            <div class="flex items-center gap-4">
              <label class="flex-1">
                <div class="flex items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                     [class.border-blue-500]="bulkInviteFile"
                     [class.bg-blue-50]="bulkInviteFile">
                  <div class="text-center">
                    @if (bulkInviteFile) {
                      <svg class="w-8 h-8 mx-auto text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <p class="text-sm text-blue-600 font-medium">{{ bulkInviteFile.name }}</p>
                    } @else {
                      <svg class="w-8 h-8 mx-auto text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      <p class="text-sm text-gray-500">Upload CSV or Excel file with emails</p>
                    }
                  </div>
                  <input
                    type="file"
                    class="hidden"
                    accept=".csv,.xlsx,.xls"
                    (change)="onBulkInviteFileSelected($event)"
                  />
                </div>
              </label>
              <button
                (click)="sendBulkInvites()"
                [disabled]="!bulkInviteFile || bulkInviteProcessing"
                class="btn btn-primary h-24 px-6"
              >
                @if (bulkInviteProcessing) {
                  <span class="flex items-center">
                    <svg class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                } @else {
                  <span class="flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                    </svg>
                    Import
                  </span>
                }
              </button>
            </div>
          </div>
        </div>

        <!-- Pending Invites -->
        <div class="card">
          <h2 class="text-lg font-semibold mb-4">Pending Invites</h2>
          @if (pendingInvitesCount() === 0) {
            <div class="text-center py-8 text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <p>No pending invites</p>
            </div>
          } @else {
            <div class="space-y-3">
              @for (invite of organizationService.invites(); track invite.id) {
                @if (!invite.accepted) {
                  <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center">
                      <div class="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 mr-3">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                        </svg>
                      </div>
                      <div>
                        <p class="font-medium text-gray-900">{{ invite.email }}</p>
                        <p class="text-sm text-gray-500">
                          Invited {{ invite.createdAt | date:'mediumDate' }}
                          · Expires {{ invite.expires_at | date:'mediumDate' }}
                        </p>
                      </div>
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
          }
        </div>
      }
    </div>
  `
})
export class TeamComponent implements OnInit {
  activeTab: TabType = 'members';
  inviteEmail = '';
  sendingInvite = false;
  openMemberMenuId: number | null = null;
  openInviteMenuId: number | null = null;
  bulkInviteFile: File | null = null;
  bulkInviteProcessing = false;

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

  pendingInvitesCount(): number {
    return this.organizationService.invites().filter(i => !i.accepted).length;
  }

  getTabClass(tab: TabType): string {
    const base = 'flex items-center py-4 px-1 border-b-2 font-medium text-sm cursor-pointer';
    if (this.activeTab === tab) {
      return `${base} border-blue-500 text-blue-600`;
    }
    return `${base} border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300`;
  }

  getMemberFullName(member: User): string {
    return member.full_name || `${member.first_name} ${member.last_name}`;
  }

  getMemberInitials(member: User): string {
    return member.initials || `${member.first_name?.charAt(0) || ''}${member.last_name?.charAt(0) || ''}`.toUpperCase();
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
    const fullName = this.getMemberFullName(member);
    this.organizationService.updateMemberRole(member.id, role).subscribe({
      next: () => this.notificationService.success(`${fullName} is now ${role === 'admin' ? 'an admin' : 'a member'}`),
      error: (err) => this.notificationService.error(err.error?.error || 'Failed to update role')
    });
  }

  removeMember(member: User): void {
    const fullName = this.getMemberFullName(member);
    if (confirm(`Are you sure you want to remove ${fullName} from the team?`)) {
      this.organizationService.removeMember(member.id).subscribe({
        next: () => this.notificationService.success(`${fullName} has been removed`),
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

  onBulkInviteFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.bulkInviteFile = input.files[0];
    }
  }

  sendBulkInvites(): void {
    if (!this.bulkInviteFile) return;

    this.bulkInviteProcessing = true;
    this.organizationService.bulkInvite(this.bulkInviteFile).subscribe({
      next: (response) => {
        const successCount = response.results.success.length;
        const failedCount = response.results.failed.length;

        if (successCount > 0 && failedCount === 0) {
          this.notificationService.success(`Successfully sent ${successCount} invites`);
        } else if (successCount > 0 && failedCount > 0) {
          this.notificationService.success(`Sent ${successCount} invites. ${failedCount} failed.`);
        } else {
          this.notificationService.error(`Failed to send invites: ${response.results.failed.map(f => f.reason).join(', ')}`);
        }

        this.bulkInviteFile = null;
        this.bulkInviteProcessing = false;
      },
      error: (err) => {
        this.notificationService.error(err.error?.error || 'Failed to process bulk invites');
        this.bulkInviteProcessing = false;
      }
    });
  }
}
