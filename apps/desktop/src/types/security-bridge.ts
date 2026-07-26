import type {
  AuthLoginRequest,
  AuthSession,
  AuthStatusResponse,
  ClientAuditEventRequest,
  SecurityAuditQuery,
  SecurityAuditResponse,
} from '@kavach/shared-types';

export interface SecurityDesktopApi {
  getStatus():
    Promise<AuthStatusResponse>;

  login(
    request:
      AuthLoginRequest,
  ): Promise<AuthSession>;

  getSession():
    Promise<AuthSession | null>;

  logout():
    Promise<void>;

  getAuditLog(
    query?:
      SecurityAuditQuery,
  ): Promise<SecurityAuditResponse>;

  recordAuditEvent(
    request:
      ClientAuditEventRequest,
  ): Promise<void>;
}
