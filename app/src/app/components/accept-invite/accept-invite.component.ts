import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrganizationService, AuthService, NotificationService } from '../../services';
import { Invite } from '../../models';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="card w-full max-w-md">
        @if (loading) {
          <div class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p class="mt-2 text-gray-600">Loading invite...</p>
          </div>
        } @else if (error) {
          <div class="text-center py-8">
            <div class="text-red-500 mb-4">
              <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-bold text-gray-800 mb-2">Invalid Invite</h2>
            <p class="text-gray-600 mb-4">{{ error }}</p>
            <a routerLink="/login" class="btn btn-primary">Go to Login</a>
          </div>
        } @else if (invite) {
          <div class="text-center mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Join {{ invite.organization?.name }}</h2>
            <p class="text-gray-600 mt-2">
              You've been invited by {{ invite.inviter?.username }}
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="mb-4">
              <label class="label">Email</label>
              <input
                type="email"
                [value]="invite.email"
                class="input bg-gray-100"
                disabled
              />
            </div>

            <div class="mb-4">
              <label class="label" for="username">Choose a Username</label>
              <input
                type="text"
                id="username"
                formControlName="username"
                class="input"
                placeholder="Enter your username"
              />
              @if (form.get('username')?.touched && form.get('username')?.invalid) {
                <p class="text-red-500 text-sm mt-1">Username is required (min 3 characters)</p>
              }
            </div>

            <div class="mb-6">
              <label class="label" for="password">Create Password</label>
              <input
                type="password"
                id="password"
                formControlName="password"
                class="input"
                placeholder="Enter your password"
              />
              @if (form.get('password')?.touched && form.get('password')?.invalid) {
                <p class="text-red-500 text-sm mt-1">Password is required (min 6 characters)</p>
              }
            </div>

            <button
              type="submit"
              [disabled]="form.invalid || submitting"
              class="btn btn-primary w-full"
            >
              {{ submitting ? 'Joining...' : 'Join Organization' }}
            </button>
          </form>

          <p class="text-center mt-4 text-gray-600">
            Already have an account?
            <a routerLink="/login" class="text-blue-600 hover:underline">Login</a>
          </p>
        }
      </div>
    </div>
  `
})
export class AcceptInviteComponent implements OnInit {
  form: FormGroup;
  invite: Invite | null = null;
  loading = true;
  submitting = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private organizationService: OrganizationService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error = 'Invalid invite link';
      this.loading = false;
      return;
    }

    this.organizationService.getInviteByToken(token).subscribe({
      next: (response) => {
        this.invite = response.invite;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error || 'This invite is invalid or has expired';
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid || !this.invite) return;

    this.submitting = true;
    this.organizationService.acceptInvite(this.invite.token, this.form.value).subscribe({
      next: (response) => {
        // Store auth data
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('auth_user', JSON.stringify(response.user));
        this.authService.updateCurrentUser(response.user);

        this.notificationService.success('Welcome to the team!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.submitting = false;
        this.notificationService.error(err.error?.error || 'Failed to join organization');
      }
    });
  }
}
