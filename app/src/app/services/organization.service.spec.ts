import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { OrganizationService } from './organization.service';
import { environment } from '../../environments/environment';
import { Organization, User, Invite } from '../models';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let httpMock: HttpTestingController;

  const mockOrganization: Organization = {
    id: 1,
    name: 'Test Org',
    slug: 'test-org',
    created_by: 1
  };

  const mockMember: User = {
    id: 2,
    username: 'member',
    email: 'member@test.com',
    org_id: 1,
    role: 'member',
    invited_by: 1
  };

  const mockInvite: Invite = {
    id: 1,
    email: 'invite@test.com',
    org_id: 1,
    token: 'test-token',
    invited_by: 1,
    accepted: false,
    expires_at: '2025-01-01',
    createdAt: '2024-01-01'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [OrganizationService]
    });

    service = TestBed.inject(OrganizationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('loadOrganization', () => {
    it('should load organization', () => {
      service.loadOrganization().subscribe(response => {
        expect(response.organization).toEqual(mockOrganization);
        expect(service.organization()).toEqual(mockOrganization);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization`);
      expect(req.request.method).toBe('GET');
      req.flush({ organization: mockOrganization });
    });
  });

  describe('loadMembers', () => {
    it('should load organization members', () => {
      service.loadMembers().subscribe(response => {
        expect(response.members).toEqual([mockMember]);
        expect(service.members()).toEqual([mockMember]);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/members`);
      expect(req.request.method).toBe('GET');
      req.flush({ members: [mockMember] });
    });

    it('should set loading state', () => {
      expect(service.loading()).toBe(false);

      service.loadMembers().subscribe();
      expect(service.loading()).toBe(true);

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/members`);
      req.flush({ members: [] });
      expect(service.loading()).toBe(false);
    });
  });

  describe('loadInvites', () => {
    it('should load invites', () => {
      service.loadInvites().subscribe(response => {
        expect(response.invites).toEqual([mockInvite]);
        expect(service.invites()).toEqual([mockInvite]);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/invites`);
      expect(req.request.method).toBe('GET');
      req.flush({ invites: [mockInvite] });
    });
  });

  describe('updateOrganization', () => {
    it('should update organization name', () => {
      const updatedOrg = { ...mockOrganization, name: 'Updated Org' };

      service.updateOrganization('Updated Org').subscribe(response => {
        expect(response.organization.name).toBe('Updated Org');
        expect(service.organization()?.name).toBe('Updated Org');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ name: 'Updated Org' });
      req.flush({ organization: updatedOrg });
    });
  });

  describe('removeMember', () => {
    it('should remove member and update list', () => {
      // First load members
      service.loadMembers().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/organization/members`).flush({ members: [mockMember] });
      expect(service.members()).toHaveLength(1);

      service.removeMember(2).subscribe(response => {
        expect(response.message).toBe('Member removed');
        expect(service.members()).toHaveLength(0);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/members/2`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Member removed' });
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role', () => {
      // First load members
      service.loadMembers().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/organization/members`).flush({ members: [mockMember] });

      service.updateMemberRole(2, 'admin').subscribe(response => {
        expect(response.member.role).toBe('admin');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/members/2/role`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ role: 'admin' });
      req.flush({ member: { ...mockMember, role: 'admin' } });
    });
  });

  describe('createInvite', () => {
    it('should create invite and add to list', () => {
      service.createInvite('newinvite@test.com').subscribe(response => {
        expect(response.message).toBe('Invite sent');
        expect(service.invites()).toContainEqual(mockInvite);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/invites`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ email: 'newinvite@test.com' });
      req.flush({ message: 'Invite sent', invite: mockInvite });
    });
  });

  describe('cancelInvite', () => {
    it('should cancel invite and remove from list', () => {
      // First load invites
      service.loadInvites().subscribe();
      httpMock.expectOne(`${environment.apiUrl}/organization/invites`).flush({ invites: [mockInvite] });
      expect(service.invites()).toHaveLength(1);

      service.cancelInvite(1).subscribe(response => {
        expect(response.message).toBe('Invite cancelled');
        expect(service.invites()).toHaveLength(0);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/invites/1`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ message: 'Invite cancelled' });
    });
  });

  describe('resendInvite', () => {
    it('should resend invite', () => {
      service.resendInvite(1).subscribe(response => {
        expect(response.message).toBe('Invite resent successfully');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/organization/invites/1/resend`);
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Invite resent successfully' });
    });
  });

  describe('getInviteByToken', () => {
    it('should get invite by token (public endpoint)', () => {
      service.getInviteByToken('test-token').subscribe(response => {
        expect(response.invite).toEqual(mockInvite);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/invites/test-token`);
      expect(req.request.method).toBe('GET');
      req.flush({ invite: mockInvite });
    });
  });

  describe('acceptInvite', () => {
    it('should accept invite (public endpoint)', () => {
      service.acceptInvite('test-token', { username: 'newuser', password: 'password' }).subscribe(response => {
        expect(response.user.username).toBe('newuser');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/invites/test-token/accept`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ username: 'newuser', password: 'password' });
      req.flush({ user: { username: 'newuser' }, token: 'new-token' });
    });
  });
});
