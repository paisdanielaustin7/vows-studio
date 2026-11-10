import { UserRole, Permission } from '@/lib/constants/permissions';

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'UNPROCESSABLE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export interface ActionError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export interface ActionResult<T = void> {
  data?: T;
  error?: ActionError;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string | null;
  avatarPath?: string | null;
  isActive: boolean;
  lockedUntil?: string | null;
  deactivatedAt?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  profile: UserProfile;
  aal: 'aal1' | 'aal2';
  permissions: Set<Permission>;
}

export interface Invitation {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tokenHash: string;
  invitedBy: string;
  expiresAt: string;
  acceptedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  actorUserId?: string | null;
  actorRole?: UserRole | null;
  action: string;
  tableName?: string | null;
  recordId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface NotificationEntry {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}
