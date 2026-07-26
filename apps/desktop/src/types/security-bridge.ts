import type {
  AuthBootstrapRequest,
  AuthLoginRequest,
  AuthSession,
  AuthStatusResponse,
  ClientAuditEventRequest,
  SecurityAuditQuery,
  SecurityAuditResponse,
} from '@kavach/shared-types';

export interface SecurityDesktopApi {
  bootstrapAdministrator(
    request:
      AuthBootstrapRequest,
  ): Promise<AuthSession>;

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

  onSessionExpired(
    listener: () => void,
  ): () => void;
}
