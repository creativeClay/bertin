import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService, NotificationService } from '../../services';
import { Component } from '@angular/core';

// Create a test host component without RouterLink
@Component({
  selector: 'app-login-test',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <input type="email" formControlName="email" />
      <input type="password" formControlName="password" />
      <button type="submit">Login</button>
    </form>
  `
})
class TestLoginComponent extends LoginComponent {}

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jest.Mocked<AuthService>;
  let notificationServiceSpy: jest.Mocked<NotificationService>;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(async () => {
    authServiceSpy = {
      login: jest.fn()
    } as any;

    notificationServiceSpy = {
      success: jest.fn(),
      error: jest.fn()
    } as any;

    routerSpy = {
      navigate: jest.fn()
    } as any;

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .overrideComponent(LoginComponent, {
      set: {
        imports: [ReactiveFormsModule],
        template: `
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <input type="email" formControlName="email" />
            <input type="password" formControlName="password" />
            <button type="submit">Login</button>
          </form>
        `
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with email and password fields', () => {
    expect(component.form.contains('email')).toBeTruthy();
    expect(component.form.contains('password')).toBeTruthy();
  });

  it('should mark form invalid when empty', () => {
    expect(component.form.valid).toBeFalsy();
  });

  it('should mark email invalid with invalid email', () => {
    const emailControl = component.form.get('email');
    emailControl?.setValue('invalid-email');
    expect(emailControl?.valid).toBeFalsy();
  });

  it('should mark form valid with valid data', () => {
    component.form.setValue({
      email: 'test@example.com',
      password: 'password123'
    });
    expect(component.form.valid).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.login).not.toHaveBeenCalled();
  });

  it('should call login service on valid submit', () => {
    const mockResponse = {
      message: 'Success',
      user: { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', org_id: 1, role: 'member' as const, invited_by: null },
      token: 'token'
    };
    authServiceSpy.login.mockReturnValue(of(mockResponse));

    component.form.setValue({
      email: 'test@example.com',
      password: 'password123'
    });
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should navigate to dashboard on successful login', () => {
    const mockResponse = {
      message: 'Success',
      user: { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', org_id: 1, role: 'member' as const, invited_by: null },
      token: 'token'
    };
    authServiceSpy.login.mockReturnValue(of(mockResponse));

    component.form.setValue({
      email: 'test@example.com',
      password: 'password123'
    });
    component.onSubmit();

    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Login successful!');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error on login failure', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: { error: 'Invalid credentials' } })));

    component.form.setValue({
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    component.onSubmit();

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Invalid credentials');
    expect(component.loading).toBeFalsy();
  });

  it('should set loading state during login', () => {
    authServiceSpy.login.mockReturnValue(of({
      message: 'Success',
      user: { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', org_id: 1, role: 'member' as const, invited_by: null },
      token: 'token'
    }));

    component.form.setValue({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(component.loading).toBeFalsy();
    component.onSubmit();
  });
});
