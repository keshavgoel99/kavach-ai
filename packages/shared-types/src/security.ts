export type OperatorRole =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'INVESTIGATOR'
  | 'ANALYST'
  | 'AUDITOR';

export type SecurityPermission =
  | 'VIEW_DASHBOARD'
  | 'VIEW_CASES'
  | 'VIEW_ENTITIES'
  | 'VIEW_GRAPH'
  | 'VIEW_PRIORITY'
  | 'VIEW_SIMILARITY'
  | 'VIEW_HOTSPOTS'
  | 'VIEW_ANALYTICS'
  | 'EXPORT_REPORTS'
  | 'VIEW_SENSITIVE_IDENTIFIERS'
  | 'VIEW_AUDIT_LOGS';

export interface OperatorSummary {
  id: string;

  username: string;
  displayName: string;

  role: OperatorRole;
}

export interface AuthSession {
  sessionId: string;

  operator:
    OperatorSummary;

  permissions:
    SecurityPermission[];

  createdAt: string;
  lastActivityAt: string;

  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

export interface AuthStatusResponse {
  configured: boolean;

  operatorCount: number;

  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  accessToken: string;

  session:
    AuthSession;
}

export type SecurityAuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'RESOURCE_ACCESSED'
  | 'ACCESS_DENIED'
  | 'REPORT_EXPORTED';

export type SecurityAuditOutcome =
  | 'SUCCESS'
  | 'FAILURE'
  | 'DENIED';

export interface SecurityAuditEntry {
  id: string;

  occurredAt: string;

  eventType:
    SecurityAuditEventType;

  outcome:
    SecurityAuditOutcome;

  operator:
    OperatorSummary | null;

  method: string | null;
  resource: string;

  resourceId: string | null;

  clientAddress: string | null;

  durationMilliseconds:
    number | null;

  metadata:
    Record<
      string,
      string | number | boolean | null
    >;
}

export interface SecurityAuditQuery {
  limit?: number;

  eventTypes?:
    SecurityAuditEventType[];
}

export interface SecurityAuditResponse {
  items:
    SecurityAuditEntry[];

  returnedCount: number;

  generatedAt: string;
}

export interface ClientAuditEventRequest {
  eventType:
    'REPORT_EXPORTED';

  outcome:
    SecurityAuditOutcome;

  resource: string;

  resourceId?: string;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}
