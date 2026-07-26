import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

import {
  appendFile,
  mkdir,
  readFile,
  rename,
  writeFile,
} from 'node:fs/promises';


import path from 'node:path';

import type {
  AuthLoginResponse,
  AuthSession,
  AuthStatusResponse,
  ClientAuditEventRequest,
  OperatorRole,
  OperatorSummary,
  SecurityAuditEntry,
  SecurityAuditEventType,
  SecurityAuditOutcome,
  SecurityAuditQuery,
  SecurityAuditResponse,
  SecurityPermission,
} from '@kavach/shared-types';

const SECURITY_DIRECTORY =
  path.resolve(
    __dirname,
    '../../../../runtime/security',
  );

const OPERATOR_STORE_PATH =
  path.join(
    SECURITY_DIRECTORY,
    'operators.json',
  );

const AUDIT_LOG_PATH =
  path.join(
    SECURITY_DIRECTORY,
    'audit.jsonl',
  );

const IDLE_TIMEOUT_MINUTES =
  30;

const ABSOLUTE_TIMEOUT_HOURS =
  8;

const MAXIMUM_LOGIN_FAILURES =
  5;

const LOGIN_FAILURE_WINDOW_MS =
  15 * 60 * 1_000;

const LOGIN_LOCKOUT_MS =
  15 * 60 * 1_000;

const MAXIMUM_AUDIT_RESULTS =
  500;

const PERMISSIONS_BY_ROLE:
Readonly<
  Record<
    OperatorRole,
    readonly SecurityPermission[]
  >
> = {
  ADMIN: [
    'VIEW_DASHBOARD',
    'VIEW_CASES',
    'VIEW_ENTITIES',
    'VIEW_GRAPH',
    'VIEW_PRIORITY',
    'VIEW_SIMILARITY',
    'VIEW_HOTSPOTS',
    'VIEW_ANALYTICS',
    'EXPORT_REPORTS',
    'VIEW_SENSITIVE_IDENTIFIERS',
    'VIEW_AUDIT_LOGS',
  ],

  SUPERVISOR: [
    'VIEW_DASHBOARD',
    'VIEW_CASES',
    'VIEW_ENTITIES',
    'VIEW_GRAPH',
    'VIEW_PRIORITY',
    'VIEW_SIMILARITY',
    'VIEW_HOTSPOTS',
    'VIEW_ANALYTICS',
    'EXPORT_REPORTS',
    'VIEW_SENSITIVE_IDENTIFIERS',
    'VIEW_AUDIT_LOGS',
  ],

  INVESTIGATOR: [
    'VIEW_DASHBOARD',
    'VIEW_CASES',
    'VIEW_ENTITIES',
    'VIEW_GRAPH',
    'VIEW_PRIORITY',
    'VIEW_SIMILARITY',
    'VIEW_HOTSPOTS',
    'VIEW_ANALYTICS',
    'EXPORT_REPORTS',
  ],

  ANALYST: [
    'VIEW_DASHBOARD',
    'VIEW_HOTSPOTS',
    'VIEW_ANALYTICS',
    'EXPORT_REPORTS',
  ],

  AUDITOR: [
    'VIEW_DASHBOARD',
    'VIEW_CASES',
    'VIEW_ENTITIES',
    'VIEW_GRAPH',
    'VIEW_PRIORITY',
    'VIEW_SIMILARITY',
    'VIEW_HOTSPOTS',
    'VIEW_ANALYTICS',
    'VIEW_AUDIT_LOGS',
  ],
};

interface OperatorRecord {
  id: string;

  username: string;
  normalizedUsername: string;

  displayName: string;

  role:
    OperatorRole;

  passwordSalt: string;
  passwordHash: string;

  active: boolean;

  createdAt: string;
}

interface OperatorStore {
  version: 1;

  operators:
    OperatorRecord[];
}

interface SessionRecord {
  sessionId: string;

  operator:
    OperatorSummary;

  permissions:
    SecurityPermission[];

  createdAtMilliseconds:
    number;

  lastActivityAtMilliseconds:
    number;

  absoluteExpiresAtMilliseconds:
    number;
}

interface LoginFailureRecord {
  failures:
    number[];

  lockedUntil:
    number | null;
}

export interface SecurityAuditInput {
  eventType:
    SecurityAuditEventType;

  outcome:
    SecurityAuditOutcome;

  operator:
    OperatorSummary | null;

  method?: string | null;

  resource: string;

  resourceId?: string | null;

  clientAddress?: string | null;

  durationMilliseconds?:
    number | null;

  metadata?: Record<
    string,
    string | number | boolean | null
  >;
}

export interface LoginContext {
  clientAddress:
    string | null;

  userAgent:
    string | null;
}

function normalizeUsername(
  value: string,
): string {
  return value
    .trim()
    .toLowerCase();
}

function createPasswordHash(
  password: string,
  saltHex: string,
): string {
  return scryptSync(
    password,
    Buffer.from(
      saltHex,
      'hex',
    ),
    64,
  ).toString('hex');
}

function verifyPassword(
  suppliedPassword: string,
  operator:
    OperatorRecord,
): boolean {
  const suppliedHash =
    Buffer.from(
      createPasswordHash(
        suppliedPassword,
        operator.passwordSalt,
      ),
      'hex',
    );

  const storedHash =
    Buffer.from(
      operator.passwordHash,
      'hex',
    );

  if (
    suppliedHash.length !==
    storedHash.length
  ) {
    return false;
  }

  return timingSafeEqual(
    suppliedHash,
    storedHash,
  );
}

function createOperatorSummary(
  operator:
    OperatorRecord,
): OperatorSummary {
  return {
    id:
      operator.id,

    username:
      operator.username,

    displayName:
      operator.displayName,

    role:
      operator.role,
  };
}

function toIsoString(
  milliseconds: number,
): string {
  return new Date(
    milliseconds,
  ).toISOString();
}

async function ensureSecurityDirectory():
Promise<void> {
  await mkdir(
    SECURITY_DIRECTORY,
    {
      recursive: true,
    },
  );
}

async function readOperatorStore():
Promise<OperatorStore> {
  try {
    const content =
      await readFile(
        OPERATOR_STORE_PATH,
        'utf8',
      );

    const parsed =
      JSON.parse(
        content,
      ) as OperatorStore;

    if (
      parsed.version !== 1 ||
      !Array.isArray(
        parsed.operators,
      )
    ) {
      throw new Error(
        'The operator store has an unsupported format.',
      );
    }

    return parsed;
  } catch (
    error: unknown
  ) {
    const errorCode =
      (
        error as {
          code?: string;
        }
      ).code;

    if (
      errorCode ===
      'ENOENT'
    ) {
      return {
        version: 1,
        operators: [],
      };
    }

    throw error;
  }
}

async function writeOperatorStore(
  store:
    OperatorStore,
): Promise<void> {
  await ensureSecurityDirectory();

  const temporaryPath =
    `${OPERATOR_STORE_PATH}.tmp`;

  await writeFile(
    temporaryPath,

    JSON.stringify(
      store,
      null,
      2,
    ),

    'utf8',
  );

  await rename(
    temporaryPath,
    OPERATOR_STORE_PATH,
  );
}

function parseAuditLine(
  line: string,
): SecurityAuditEntry | null {
  try {
    return JSON.parse(
      line,
    ) as SecurityAuditEntry;
  } catch {
    return null;
  }
}

let auditWriteQueue:
  Promise<void> =
  Promise.resolve();

export class SecurityService {
  private readonly sessions =
    new Map<
      string,
      SessionRecord
    >();

  private readonly loginFailures =
    new Map<
      string,
      LoginFailureRecord
    >();

  public async getStatus(): Promise<AuthStatusResponse> {
    const store =
      await readOperatorStore();

    return {
      configured:
        store.operators.some(
          (operator) =>
            operator.active,
        ),

      operatorCount:
        store.operators.filter(
          (operator) =>
            operator.active,
        ).length,

      idleTimeoutMinutes:
        IDLE_TIMEOUT_MINUTES,

      absoluteTimeoutHours:
        ABSOLUTE_TIMEOUT_HOURS,
    };
  }

  public async login(
    suppliedUsername: string,
    suppliedPassword: string,
    context:
      LoginContext,
  ): Promise<AuthLoginResponse> {
    const username =
      suppliedUsername.trim();

    const normalizedUsername =
      normalizeUsername(
        username,
      );

    const failureKey = [
      normalizedUsername,
      context.clientAddress ??
        'unknown',
    ].join(':');

    const now =
      Date.now();

    const failureRecord =
      this.loginFailures.get(
        failureKey,
      );

    if (
      failureRecord
        ?.lockedUntil &&
      failureRecord.lockedUntil >
        now
    ) {
      await this.appendAudit({
        eventType:
          'LOGIN_FAILURE',

        outcome:
          'DENIED',

        operator: null,

        resource:
          'authentication',

        clientAddress:
          context.clientAddress,

        metadata: {
          username,
          reason:
            'Temporary login lockout',
        },
      });

      throw new Error(
        'Login is temporarily locked. Try again later.',
      );
    }

    const store =
      await readOperatorStore();

    const operator =
      store.operators.find(
        (candidate) =>
          candidate.active &&
          candidate
            .normalizedUsername ===
            normalizedUsername,
      );

    const valid =
      Boolean(
        operator &&
        verifyPassword(
          suppliedPassword,
          operator,
        ),
      );

    if (
      !operator ||
      !valid
    ) {
      this.recordLoginFailure(
        failureKey,
        now,
      );

      await this.appendAudit({
        eventType:
          'LOGIN_FAILURE',

        outcome:
          'FAILURE',

        operator: null,

        resource:
          'authentication',

        clientAddress:
          context.clientAddress,

        metadata: {
          username,
          reason:
            'Invalid credentials',
        },
      });

      throw new Error(
        'The username or password is incorrect.',
      );
    }

    this.loginFailures.delete(
      failureKey,
    );

    const accessToken =
      randomBytes(32)
        .toString(
          'base64url',
        );

    const createdAt =
      Date.now();

    const session:
      SessionRecord = {
      sessionId:
        randomUUID(),

      operator:
        createOperatorSummary(
          operator,
        ),

      permissions: [
        ...PERMISSIONS_BY_ROLE[
          operator.role
        ],
      ],

      createdAtMilliseconds:
        createdAt,

      lastActivityAtMilliseconds:
        createdAt,

      absoluteExpiresAtMilliseconds:
        createdAt +
        ABSOLUTE_TIMEOUT_HOURS *
          60 *
          60 *
          1_000,
    };

    this.sessions.set(
      accessToken,
      session,
    );

    await this.appendAudit({
      eventType:
        'LOGIN_SUCCESS',

      outcome:
        'SUCCESS',

      operator:
        session.operator,

      resource:
        'authentication',

      clientAddress:
        context.clientAddress,

      metadata: {
        userAgent:
          context.userAgent,
      },
    });

    return {
      accessToken,

      session:
        this.toAuthSession(
          session,
        ),
    };
  }

  public resolveSession(
    accessToken: string,
  ): AuthSession | null {
    const session =
      this.sessions.get(
        accessToken,
      );

    if (!session) {
      return null;
    }

    const now =
      Date.now();

    const idleExpiresAt =
      session
        .lastActivityAtMilliseconds +
      IDLE_TIMEOUT_MINUTES *
        60 *
        1_000;

    if (
      idleExpiresAt <= now ||
      session
        .absoluteExpiresAtMilliseconds <=
        now
    ) {
      this.sessions.delete(
        accessToken,
      );

      return null;
    }

    session
      .lastActivityAtMilliseconds =
      now;

    return this.toAuthSession(
      session,
    );
  }

  public async logout(
    accessToken: string,
    clientAddress:
      string | null,
  ): Promise<void> {
    const session =
      this.sessions.get(
        accessToken,
      );

    this.sessions.delete(
      accessToken,
    );

    if (session) {
      await this.appendAudit({
        eventType:
          'LOGOUT',

        outcome:
          'SUCCESS',

        operator:
          session.operator,

        resource:
          'authentication',

        clientAddress,
      });
    }
  }

  public hasPermission(
    session:
      AuthSession,

    permission:
      SecurityPermission,
  ): boolean {
    return session
      .permissions
      .includes(
        permission,
      );
  }

  public async appendAudit(
    input:
      SecurityAuditInput,
  ): Promise<void> {
    const entry:
      SecurityAuditEntry = {
      id:
        randomUUID(),

      occurredAt:
        new Date()
          .toISOString(),

      eventType:
        input.eventType,

      outcome:
        input.outcome,

      operator:
        input.operator,

      method:
        input.method ??
        null,

      resource:
        input.resource,

      resourceId:
        input.resourceId ??
        null,

      clientAddress:
        input.clientAddress ??
        null,

      durationMilliseconds:
        input.durationMilliseconds ??
        null,

      metadata:
        input.metadata ??
        {},
    };

    auditWriteQueue =
      auditWriteQueue.then(
        async () => {
          await ensureSecurityDirectory();

          await appendFile(
            AUDIT_LOG_PATH,

            `${JSON.stringify(entry)}\n`,

            'utf8',
          );
        },
      );

    await auditWriteQueue;
  }

  public async listAuditEntries(
    query:
      SecurityAuditQuery = {},
  ): Promise<SecurityAuditResponse> {
    const limit =
      query.limit ??
      100;

    if (
      !Number.isSafeInteger(
        limit,
      ) ||
      limit < 1 ||
      limit >
        MAXIMUM_AUDIT_RESULTS
    ) {
      throw new Error(
        `Audit limit must be between 1 and ${MAXIMUM_AUDIT_RESULTS}.`,
      );
    }

    let content: string;

    try {
      content =
        await readFile(
          AUDIT_LOG_PATH,
          'utf8',
        );
    } catch (
      error: unknown
    ) {
      const errorCode =
        (
          error as {
            code?: string;
          }
        ).code;

      if (
        errorCode ===
        'ENOENT'
      ) {
        return {
          items: [],

          returnedCount: 0,

          generatedAt:
            new Date()
              .toISOString(),
        };
      }

      throw error;
    }

    const eventFilter =
      query.eventTypes &&
      query.eventTypes.length >
        0
        ? new Set(
            query.eventTypes,
          )
        : null;

    const entries =
      content
        .split(/\r?\n/)
        .filter(Boolean)
        .map(parseAuditLine)
        .filter(
          (
            entry,
          ): entry is
            SecurityAuditEntry =>
            entry !== null,
        )
        .filter(
          (entry) =>
            !eventFilter ||
            eventFilter.has(
              entry.eventType,
            ),
        )
        .slice(-limit)
        .reverse();

    return {
      items:
        entries,

      returnedCount:
        entries.length,

      generatedAt:
        new Date()
          .toISOString(),
    };
  }

  public async recordClientEvent(
    session:
      AuthSession,

    request:
      ClientAuditEventRequest,

    clientAddress:
      string | null,
  ): Promise<void> {
    await this.appendAudit({
      eventType:
        request.eventType,

      outcome:
        request.outcome,

      operator:
        session.operator,

      resource:
        request.resource,

      resourceId:
        request.resourceId ??
        null,

      clientAddress,

      metadata:
        request.metadata,
    });
  }

  private toAuthSession(
    session:
      SessionRecord,
  ): AuthSession {
    const idleExpiresAt =
      session
        .lastActivityAtMilliseconds +
      IDLE_TIMEOUT_MINUTES *
        60 *
        1_000;

    return {
      sessionId:
        session.sessionId,

      operator:
        session.operator,

      permissions: [
        ...session.permissions,
      ],

      createdAt:
        toIsoString(
          session
            .createdAtMilliseconds,
        ),

      lastActivityAt:
        toIsoString(
          session
            .lastActivityAtMilliseconds,
        ),

      idleExpiresAt:
        toIsoString(
          idleExpiresAt,
        ),

      absoluteExpiresAt:
        toIsoString(
          session
            .absoluteExpiresAtMilliseconds,
        ),
    };
  }

  private recordLoginFailure(
    failureKey: string,
    now: number,
  ): void {
    const existing =
      this.loginFailures.get(
        failureKey,
      ) ?? {
        failures: [],
        lockedUntil: null,
      };

    existing.failures =
      existing.failures.filter(
        (failureTime) =>
          now - failureTime <=
          LOGIN_FAILURE_WINDOW_MS,
      );

    existing.failures.push(
      now,
    );

    if (
      existing.failures.length >=
      MAXIMUM_LOGIN_FAILURES
    ) {
      existing.lockedUntil =
        now +
        LOGIN_LOCKOUT_MS;
    }

    this.loginFailures.set(
      failureKey,
      existing,
    );
  }
}

export async function createOperatorAccount(
  username: string,
  displayName: string,
  role: OperatorRole,
  password: string,
): Promise<OperatorSummary> {
  const cleanedUsername =
    username.trim();

  const normalizedUsername =
    normalizeUsername(
      cleanedUsername,
    );

  const cleanedDisplayName =
    displayName.trim();

  if (
    !/^[a-zA-Z0-9._-]{3,40}$/.test(
      cleanedUsername,
    )
  ) {
    throw new Error(
      [
        'Username must contain 3-40',
        'letters, numbers, periods,',
        'underscores or hyphens.',
      ].join(' '),
    );
  }

  if (
    cleanedDisplayName.length <
      2 ||
    cleanedDisplayName.length >
      100
  ) {
    throw new Error(
      'Display name must contain 2-100 characters.',
    );
  }

  if (
    password.length < 12
  ) {
    throw new Error(
      'Password must contain at least 12 characters.',
    );
  }

  if (
    !Object.prototype.hasOwnProperty.call(
      PERMISSIONS_BY_ROLE,
      role,
    )
  ) {
    throw new Error(
      `Unsupported operator role: ${String(role)}.`,
    );
  }

  const store =
    await readOperatorStore();

  if (
    store.operators.some(
      (operator) =>
        operator
          .normalizedUsername ===
        normalizedUsername,
    )
  ) {
    throw new Error(
      `Operator ${cleanedUsername} already exists.`,
    );
  }

  const salt =
    randomBytes(32)
      .toString('hex');

  const operator:
    OperatorRecord = {
    id:
      randomUUID(),

    username:
      cleanedUsername,

    normalizedUsername,

    displayName:
      cleanedDisplayName,

    role,

    passwordSalt:
      salt,

    passwordHash:
      createPasswordHash(
        password,
        salt,
      ),

    active: true,

    createdAt:
      new Date()
        .toISOString(),
  };

  store.operators.push(
    operator,
  );

  await writeOperatorStore(
    store,
  );

  return createOperatorSummary(
    operator,
  );
}

let securityService:
  SecurityService | null =
  null;

export function getSecurityService(): SecurityService {
  if (!securityService) {
    securityService =
      new SecurityService();
  }

  return securityService;
}
