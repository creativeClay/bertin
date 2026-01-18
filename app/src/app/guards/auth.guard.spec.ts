import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from '../services';

describe('Auth Guards', () => {
  let routerSpy: jest.Mocked<Router>;
  let authServiceMock: Partial<AuthService>;

  beforeEach(() => {
    routerSpy = {
      navigate: jest.fn()
    } as any;
  });

  describe('authGuard', () => {
    it('should return true when user is authenticated', () => {
      authServiceMock = {
        isAuthenticated: signal(true).asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: Router, useValue: routerSpy },
          { provide: AuthService, useValue: authServiceMock }
        ]
      });

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(true);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to login when user is not authenticated', () => {
      authServiceMock = {
        isAuthenticated: signal(false).asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: Router, useValue: routerSpy },
          { provide: AuthService, useValue: authServiceMock }
        ]
      });

      const result = TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('guestGuard', () => {
    it('should return true when user is not authenticated', () => {
      authServiceMock = {
        isAuthenticated: signal(false).asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: Router, useValue: routerSpy },
          { provide: AuthService, useValue: authServiceMock }
        ]
      });

      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(true);
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to dashboard when user is authenticated', () => {
      authServiceMock = {
        isAuthenticated: signal(true).asReadonly()
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: Router, useValue: routerSpy },
          { provide: AuthService, useValue: authServiceMock }
        ]
      });

      const result = TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
      expect(result).toBe(false);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });
});
