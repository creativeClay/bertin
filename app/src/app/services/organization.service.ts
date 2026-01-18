import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Organization, User, Invite } from '../models';

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly apiUrl = `${environment.apiUrl}/organization`;
  private readonly inviteApiUrl = `${environment.apiUrl}/invites`;

  private organizationSignal = signal<Organization | null>(null);
  private membersSignal = signal<User[]>([]);
  private invitesSignal = signal<Invite[]>([]);
  private loadingSignal = signal<boolean>(false);

  readonly organization = this.organizationSignal.asReadonly();
  readonly members = this.membersSignal.asReadonly();
  readonly invites = this.invitesSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadOrganization(): Observable<{ organization: Organization }> {
    return this.http.get<{ organization: Organization }>(this.apiUrl).pipe(
      tap(response => this.organizationSignal.set(response.organization))
    );
  }

  loadMembers(): Observable<{ members: User[] }> {
    this.loadingSignal.set(true);
    return this.http.get<{ members: User[] }>(`${this.apiUrl}/members`).pipe(
      tap(response => {
        this.membersSignal.set(response.members);
        this.loadingSignal.set(false);
      })
    );
  }

  loadInvites(): Observable<{ invites: Invite[] }> {
    return this.http.get<{ invites: Invite[] }>(`${this.apiUrl}/invites`).pipe(
      tap(response => this.invitesSignal.set(response.invites))
    );
  }

  updateOrganization(name: string): Observable<{ organization: Organization }> {
    return this.http.put<{ organization: Organization }>(this.apiUrl, { name }).pipe(
      tap(response => this.organizationSignal.set(response.organization))
    );
  }

  removeMember(memberId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/members/${memberId}`).pipe(
      tap(() => {
        this.membersSignal.update(members => members.filter(m => m.id !== memberId));
      })
    );
  }

  updateMemberRole(memberId: number, role: 'admin' | 'member'): Observable<{ member: User }> {
    return this.http.put<{ member: User }>(`${this.apiUrl}/members/${memberId}/role`, { role }).pipe(
      tap(response => {
        this.membersSignal.update(members =>
          members.map(m => m.id === memberId ? { ...m, role } : m)
        );
      })
    );
  }

  createInvite(email: string): Observable<{ message: string; invite: Invite }> {
    return this.http.post<{ message: string; invite: Invite }>(`${this.apiUrl}/invites`, { email }).pipe(
      tap(response => {
        this.invitesSignal.update(invites => [response.invite, ...invites]);
      })
    );
  }

  cancelInvite(inviteId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/invites/${inviteId}`).pipe(
      tap(() => {
        this.invitesSignal.update(invites => invites.filter(i => i.id !== inviteId));
      })
    );
  }

  // Public endpoints (no auth required)
  getInviteByToken(token: string): Observable<{ invite: Invite }> {
    return this.http.get<{ invite: Invite }>(`${this.inviteApiUrl}/${token}`);
  }

  acceptInvite(token: string, data: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.inviteApiUrl}/${token}/accept`, data);
  }
}
