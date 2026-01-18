import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: jest.Mocked<Router>;

  beforeEach(() => {
    routerSpy = {
      navigate: jest.fn()
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);

    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('register', () => {
    it('should register and store user data', () => {
      const mockResponse = {
        message: 'Organization created successfully',
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@test.com',
          org_id: 1,
          role: 'admin' as const,
          invited_by: null
        },
        organization: { id: 1, name: 'Test Org', slug: 'test-org', created_by: 1 },
        token: 'test-token'
      };

      service.register({
        username: 'admin',
        email: 'admin@test.com',
        password: 'password',
        organizationName: 'Test Org'
      }).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
        expect(service.currentUser()?.username).toBe('admin');
        expect(service.isAuthenticated()).toBe(true);
        expect(service.isAdmin()).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('login', () => {
    it('should login and store user data', () => {
      const mockResponse = {
        message: 'Login successful',
        user: {
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          org_id: 1,
          role: 'member' as const,
          invited_by: null
        },
        token: 'test-token'
      };

      service.login({
        email: 'test@test.com',
        password: 'password'
      }).subscribe(response => {
        expect(response).toEqual(mockResponse);
        expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
        expect(service.currentUser()?.email).toBe('test@test.com');
        expect(service.isAuthenticated()).toBe(true);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('logout', () => {
    it('should clear user data and redirect to login', () => {
      // First login
      const mockUser = {
        id: 1,
        username: 'test',
        email: 'test@test.com',
        org_id: 1,
        role: 'member' as const,
        invited_by: null
      };

      service.updateCurrentUser(mockUser);
      expect(service.isAuthenticated()).toBe(true);

      // Then logout
      service.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_user');
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('getToken', () => {
    it('should return token from localStorage', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('stored-token');
      expect(service.getToken()).toBe('stored-token');
    });

    it('should return null if no token', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue(null);
      expect(service.getToken()).toBeNull();
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin user', () => {
      const adminUser = {
        id: 1,
        username: 'admin',
        email: 'admin@test.com',
        org_id: 1,
        role: 'admin' as const,
        invited_by: null
      };
      service.updateCurrentUser(adminUser);
      expect(service.isAdmin()).toBe(true);
    });

    it('should return false for member user', () => {
      const memberUser = {
        id: 1,
        username: 'member',
        email: 'member@test.com',
        org_id: 1,
        role: 'member' as const,
        invited_by: null
      };
      service.updateCurrentUser(memberUser);
      expect(service.isAdmin()).toBe(false);
    });
  });

  describe('hasOrganization', () => {
    it('should return true if user has org_id', () => {
      const user = {
        id: 1,
        username: 'test',
        email: 'test@test.com',
        org_id: 1,
        role: 'member' as const,
        invited_by: null
      };
      service.updateCurrentUser(user);
      expect(service.hasOrganization()).toBe(true);
    });

    it('should return false if user has no org_id', () => {
      const user = {
        id: 1,
        username: 'test',
        email: 'test@test.com',
        org_id: null,
        role: 'member' as const,
        invited_by: null
      };
      service.updateCurrentUser(user);
      expect(service.hasOrganization()).toBe(false);
    });
  });
});
