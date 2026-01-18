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
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  email: string;
  org_id: number | null;
  role: UserRole;
  invited_by: number | null;
  organization?: Organization;
  inviter?: { id: number; first_name: string; last_name: string };
  // Computed fields from backend
  full_name?: string;
  display_name?: string;
  initials?: string;
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
  first_name: string;
  last_name: string;
  middle_name?: string;
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
  inviter?: { id: number; first_name: string; last_name: string };
  createdAt: string;
}

export interface AcceptInviteRequest {
  first_name: string;
  last_name: string;
  middle_name?: string;
  password: string;
}
