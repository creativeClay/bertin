import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, NotificationService } from '../../services';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="card w-full max-w-md">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">Create Organization</h2>
        <p class="text-center text-gray-600 mb-6">Set up your organization and admin account</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="mb-4">
            <label class="label" for="organizationName">Organization Name</label>
            <input
              type="text"
              id="organizationName"
              formControlName="organizationName"
              class="input"
              placeholder="Your company or team name"
            />
            @if (form.get('organizationName')?.touched && form.get('organizationName')?.invalid) {
              <p class="text-red-500 text-sm mt-1">Organization name is required</p>
            }
          </div>

          <hr class="my-6 border-gray-200" />

          <p class="text-sm text-gray-600 mb-4">Admin Account Details</p>

          <div class="mb-4">
            <label class="label" for="username">Username</label>
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

          <div class="mb-4">
            <label class="label" for="email">Email</label>
            <input
              type="email"
              id="email"
              formControlName="email"
              class="input"
              placeholder="Enter your email"
            />
            @if (form.get('email')?.touched && form.get('email')?.invalid) {
              <p class="text-red-500 text-sm mt-1">Valid email is required</p>
            }
          </div>

          <div class="mb-6">
            <label class="label" for="password">Password</label>
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
            [disabled]="form.invalid || loading"
            class="btn btn-primary w-full"
          >
            {{ loading ? 'Creating...' : 'Create Organization' }}
          </button>
        </form>

        <p class="text-center mt-4 text-gray-600">
          Already have an account?
          <a routerLink="/login" class="text-blue-600 hover:underline">Login</a>
        </p>
      </div>
    </div>
  `
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      organizationName: ['', Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.authService.register(this.form.value).subscribe({
      next: () => {
        this.notificationService.success('Organization created successfully!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(err.error?.error || 'Registration failed');
      }
    });
  }
}
