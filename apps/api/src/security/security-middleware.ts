import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';

import type {
  AuthSession,
  SecurityPermission,
} from '@kavach/shared-types';

import {
  getSecurityService,
} from './security-service';

interface RequestSecurityContext {
  accessToken: string;

  session:
    AuthSession;
}

const requestSecurityContext =
  new WeakMap<
    Request,
    RequestSecurityContext
  >();

const SENSITIVE_KEYS =
  new Set([
    'identifierValue',
    'normalizedValue',
    'phoneNumber',
    'mobileNumber',
    'emailAddress',
    'aadhaarNumber',
    'panNumber',
    'passportNumber',
    'accountNumber',
    'cardNumber',
    'imei',
    'imsi',
    'ipAddress',
    'macAddress',
  ]);

function extractBearerToken(
  request:
    Request,
): string | null {
  const authorization =
    request.get(
      'authorization',
    );

  if (!authorization) {
    return null;
  }

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization.trim(),
    );

  return match?.[1]?.trim() ??
    null;
}

function sendUnauthorized(
  response:
    Response,
): void {
  response.status(401).json({
    error: {
      code:
        'AUTHENTICATION_REQUIRED',

      message:
        'A valid operator session is required.',
    },
  });
}

function maskValue(
  value: string,
): string {
  if (
    value.includes('@')
  ) {
    const [
      localPart,
      domain,
    ] =
      value.split('@');

    return [
      localPart
        ? `${localPart.slice(0, 1)}***`
        : '***',

      domain ??
        '***',
    ].join('@');
  }

  const visibleEnding =
    value.slice(-4);

  return [
    '••••••',
    visibleEnding,
  ].join('');
}

function redactSensitiveData(
  value: unknown,
  depth = 0,
): unknown {
  if (
    depth > 25 ||
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      (item) =>
        redactSensitiveData(
          item,
          depth + 1,
        ),
    );
  }

  if (
    typeof value !==
      'object'
  ) {
    return value;
  }

  const record =
    value as
      Record<
        string,
        unknown
      >;

  const result:
    Record<
      string,
      unknown
    > = {};

  const isIdentifierNode =
    record.nodeType ===
      'IDENTIFIER' ||
    record.type ===
      'IDENTIFIER';

  Object.entries(record)
    .forEach(
      ([
        key,
        childValue,
      ]) => {
        if (
          SENSITIVE_KEYS.has(
            key,
          ) &&
          typeof childValue ===
            'string'
        ) {
          result[key] =
            maskValue(
              childValue,
            );

          return;
        }

        if (
          isIdentifierNode &&
          (
            key === 'label' ||
            key === 'title' ||
            key === 'displayValue'
          ) &&
          typeof childValue ===
            'string'
        ) {
          result[key] =
            maskValue(
              childValue,
            );

          return;
        }

        result[key] =
          redactSensitiveData(
            childValue,
            depth + 1,
          );
      },
    );

  return result;
}

export function getRequestSecurityContext(
  request:
    Request,
): RequestSecurityContext | null {
  return (
    requestSecurityContext.get(
      request,
    ) ??
    null
  );
}

export const authenticateRequest:
RequestHandler = (
  request,
  response,
  next,
) => {
  if (
    request.path ===
      '/health'
  ) {
    next();

    return;
  }

  const accessToken =
    extractBearerToken(
      request,
    );

  if (!accessToken) {
    sendUnauthorized(
      response,
    );

    return;
  }

  const session =
    getSecurityService()
      .resolveSession(
        accessToken,
      );

  if (!session) {
    sendUnauthorized(
      response,
    );

    return;
  }

  requestSecurityContext.set(
    request,
    {
      accessToken,
      session,
    },
  );

  next();
};

export function requirePermission(
  permission:
    SecurityPermission,
): RequestHandler {
  return (
    request,
    response,
    next,
  ) => {
    const context =
      getRequestSecurityContext(
        request,
      );

    if (!context) {
      sendUnauthorized(
        response,
      );

      return;
    }

    const allowed =
      getSecurityService()
        .hasPermission(
          context.session,
          permission,
        );

    if (!allowed) {
      void getSecurityService()
        .appendAudit({
          eventType:
            'ACCESS_DENIED',

          outcome:
            'DENIED',

          operator:
            context
              .session
              .operator,

          method:
            request.method,

          resource:
            request.path,

          clientAddress:
            request.ip ??
            null,

          metadata: {
            requiredPermission:
              permission,
          },
        });

      response.status(403).json({
        error: {
          code:
            'PERMISSION_DENIED',

          message:
            `Permission ${permission} is required.`,
        },
      });

      return;
    }

    next();
  };
}

export const auditAuthenticatedRequest:
RequestHandler = (
  request,
  response,
  next,
) => {
  const startedAt =
    Date.now();

  response.once(
    'finish',
    () => {
      const context =
        getRequestSecurityContext(
          request,
        );

      if (
        !context ||
        request.path ===
          '/health'
      ) {
        return;
      }

      void getSecurityService()
        .appendAudit({
          eventType:
            'RESOURCE_ACCESSED',

          outcome:
            response.statusCode >=
            400
              ? 'FAILURE'
              : 'SUCCESS',

          operator:
            context
              .session
              .operator,

          method:
            request.method,

          resource:
            request.path,

          clientAddress:
            request.ip ??
            null,

          durationMilliseconds:
            Date.now() -
            startedAt,

          metadata: {
            statusCode:
              response.statusCode,
          },
        });
    },
  );

  next();
};

export const maskSensitiveResponse:
RequestHandler = (
  request,
  response,
  next,
) => {
  const context =
    getRequestSecurityContext(
      request,
    );

  const canViewSensitive =
    context?.session
      .permissions
      .includes(
        'VIEW_SENSITIVE_IDENTIFIERS',
      ) ??
    false;

  if (canViewSensitive) {
    next();

    return;
  }

  const originalJson =
    response.json.bind(
      response,
    );

  response.json = ((
    body: unknown,
  ) =>
    originalJson(
      redactSensitiveData(
        body,
      ),
    )) as typeof response.json;

  next();
};
