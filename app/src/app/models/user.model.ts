export type UserRole = 'admin' | 'member';

export interface Organization {
  id: number;
  name: string;
  slug: string;
  created_by: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  org_id: number | null;
  role: UserRole;
  invited_by: number | null;
  organization?: Organization;
  inviter?: { id: number; username: string };
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  organization?: Organization;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface Invite {
  id: number;
  email: string;
  org_id: number;
  token: string;
  invited_by: number;
  accepted: boolean;
  expires_at: string;
  organization?: Organization;
  inviter?: { id: number; username: string };
  createdAt: string;
}

export interface AcceptInviteRequest {
  username: string;
  password: string;
}
