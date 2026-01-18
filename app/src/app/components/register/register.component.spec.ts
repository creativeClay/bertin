import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register.component';
import { AuthService, NotificationService } from '../../services';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authServiceSpy: jest.Mocked<AuthService>;
  let notificationServiceSpy: jest.Mocked<NotificationService>;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(async () => {
    authServiceSpy = {
      register: jest.fn()
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
    .overrideComponent(RegisterComponent, {
      set: {
        imports: [ReactiveFormsModule],
        template: `
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <input formControlName="organizationName" />
            <input formControlName="first_name" />
            <input formControlName="last_name" />
            <input type="email" formControlName="email" />
            <input type="password" formControlName="password" />
            <button type="submit">Register</button>
          </form>
        `
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a form with all required fields', () => {
    expect(component.form.contains('organizationName')).toBeTruthy();
    expect(component.form.contains('first_name')).toBeTruthy();
    expect(component.form.contains('last_name')).toBeTruthy();
    expect(component.form.contains('email')).toBeTruthy();
    expect(component.form.contains('password')).toBeTruthy();
  });

  it('should mark form invalid when empty', () => {
    expect(component.form.valid).toBeFalsy();
  });

  it('should validate password minimum length', () => {
    const passwordControl = component.form.get('password');
    passwordControl?.setValue('12345');
    expect(passwordControl?.valid).toBeFalsy();
    passwordControl?.setValue('123456');
    expect(passwordControl?.valid).toBeTruthy();
  });

  it('should mark form valid with valid data', () => {
    component.form.setValue({
      organizationName: 'Test Org',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(component.form.valid).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.onSubmit();
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('should call register service on valid submit', () => {
    const mockResponse = {
      message: 'Organization created',
      user: { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', org_id: 1, role: 'admin' as const, invited_by: null },
      organization: { id: 1, name: 'Test Org', slug: 'test-org', created_by: 1 },
      token: 'token'
    };
    authServiceSpy.register.mockReturnValue(of(mockResponse));

    component.form.setValue({
      organizationName: 'Test Org',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    component.onSubmit();

    expect(authServiceSpy.register).toHaveBeenCalledWith({
      organizationName: 'Test Org',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('should navigate to dashboard on successful registration', () => {
    const mockResponse = {
      message: 'Organization created',
      user: { id: 1, first_name: 'Test', last_name: 'User', email: 'test@example.com', org_id: 1, role: 'admin' as const, invited_by: null },
      organization: { id: 1, name: 'Test Org', slug: 'test-org', created_by: 1 },
      token: 'token'
    };
    authServiceSpy.register.mockReturnValue(of(mockResponse));

    component.form.setValue({
      organizationName: 'Test Org',
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      password: 'password123'
    });
    component.onSubmit();

    expect(notificationServiceSpy.success).toHaveBeenCalledWith('Organization created successfully!');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should show error on registration failure', () => {
    authServiceSpy.register.mockReturnValue(throwError(() => ({ error: { error: 'Email already registered' } })));

    component.form.setValue({
      organizationName: 'Test Org',
      first_name: 'Test',
      last_name: 'User',
      email: 'existing@example.com',
      password: 'password123'
    });
    component.onSubmit();

    expect(notificationServiceSpy.error).toHaveBeenCalledWith('Email already registered');
    expect(component.loading).toBeFalsy();
  });
});
