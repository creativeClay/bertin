import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, NotificationService } from '../../services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-100">
      <div class="card w-full max-w-md">
        <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">Login</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
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
              <p class="text-red-500 text-sm mt-1">Password is required</p>
            }
          </div>

          <button
            type="submit"
            [disabled]="form.invalid || loading"
            class="btn btn-primary w-full"
          >
            {{ loading ? 'Logging in...' : 'Login' }}
          </button>
        </form>

        <p class="text-center mt-4 text-gray-600">
          Don't have an account?
          <a routerLink="/register" class="text-blue-600 hover:underline">Register</a>
        </p>
      </div>
    </div>
  `
})
export class LoginComponent {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading = true;
    this.authService.login(this.form.value).subscribe({
      next: () => {
        this.notificationService.success('Login successful!');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(err.error?.error || 'Login failed');
      }
    });
  }
}
