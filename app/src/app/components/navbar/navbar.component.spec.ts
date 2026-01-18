import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { NavbarComponent } from './navbar.component';
import { AuthService } from '../../services';
import { User } from '../../models';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;
  let authServiceMock: Partial<AuthService>;

  const mockUser: User = {
    id: 1,
    first_name: 'Test',
    last_name: 'User',
    email: 'test@example.com',
    org_id: 1,
    role: 'admin',
    invited_by: null,
    full_name: 'Test User',
    display_name: 'Test U.',
    initials: 'TU'
  };

  beforeEach(async () => {
    authServiceMock = {
      currentUser: signal(mockUser).asReadonly(),
      isAuthenticated: signal(true).asReadonly(),
      logout: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, NavbarComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user name when authenticated', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test U.');
  });

  it('should display role when authenticated', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Admin');
  });

  it('should call logout on logout button click', () => {
    // First open the dropdown by clicking the profile button
    component.showDropdown = true;
    fixture.detectChanges();

    // Find and click the logout button (it contains 'Logout' text)
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const logoutButton = Array.from(buttons).find((btn: any) => btn.textContent?.includes('Logout'));
    (logoutButton as HTMLButtonElement)?.click();
    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('should show navigation links when authenticated', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Team');
  });
});
