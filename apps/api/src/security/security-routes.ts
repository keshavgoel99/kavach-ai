import {
  Router,
} from 'express';

import type {
  AuthBootstrapRequest,
  AuthLoginRequest,
  ClientAuditEventRequest,
  SecurityAuditEventType,
} from '@kavach/shared-types';

import {
  getRequestSecurityContext,
  requirePermission,
} from './security-middleware';

import {
  createOperatorAccount,
  getSecurityService,
} from './security-service';

const AUDIT_EVENT_TYPES =
  new Set<
    SecurityAuditEventType
  >([
    'LOGIN_SUCCESS',
    'LOGIN_FAILURE',
    'LOGOUT',
    'RESOURCE_ACCESSED',
    'ACCESS_DENIED',
    'REPORT_EXPORTED',
  ]);

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseBootstrapRequest(
  body: unknown,
): AuthBootstrapRequest {
  if (!isRecord(body)) {
    throw new Error(
      'An administrator setup request is required.',
    );
  }

  if (
    typeof body.username !== 'string' ||
    typeof body.displayName !== 'string' ||
    typeof body.password !== 'string'
  ) {
    throw new Error(
      [
        'Username, display name and',
        'password are required.',
      ].join(' '),
    );
  }

  return {
    username:
      body.username.trim(),

    displayName:
      body.displayName.trim(),

    password:
      body.password,
  };
}

function parseLoginRequest(
  body: unknown,
): AuthLoginRequest {
  if (!isRecord(body)) {
    throw new Error(
      'A login request is required.',
    );
  }

  if (
    typeof body.username !==
      'string' ||
    typeof body.password !==
      'string'
  ) {
    throw new Error(
      'Username and password are required.',
    );
  }

  return {
    username:
      body.username,

    password:
      body.password,
  };
}

function parseAuditEventTypes(
  supplied: unknown,
): SecurityAuditEventType[] {
  if (
    supplied === undefined
  ) {
    return [];
  }

  const values =
    Array.isArray(supplied)
      ? supplied
      : [supplied];

  const result =
    new Set<
      SecurityAuditEventType
    >();

  values.forEach(
    (value) => {
      if (
        typeof value !==
          'string'
      ) {
        throw new Error(
          'eventTypes must contain text values.',
        );
      }

      value
        .split(',')
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
        .forEach(
          (item) => {
            const candidate =
              item as
                SecurityAuditEventType;

            if (
              !AUDIT_EVENT_TYPES.has(
                candidate,
              )
            ) {
              throw new Error(
                `Unsupported audit event type: ${item}.`,
              );
            }

            result.add(
              candidate,
            );
          },
        );
    },
  );

  return [
    ...result,
  ];
}

function parseClientAuditEvent(
  body: unknown,
): ClientAuditEventRequest {
  if (!isRecord(body)) {
    throw new Error(
      'An audit event request is required.',
    );
  }

  if (
    body.eventType !==
      'REPORT_EXPORTED'
  ) {
    throw new Error(
      'Unsupported client audit event.',
    );
  }

  if (
    body.outcome !==
      'SUCCESS' &&
    body.outcome !==
      'FAILURE' &&
    body.outcome !==
      'DENIED'
  ) {
    throw new Error(
      'Unsupported audit outcome.',
    );
  }

  if (
    typeof body.resource !==
      'string' ||
    !body.resource.trim()
  ) {
    throw new Error(
      'Audit resource is required.',
    );
  }

  return {
    eventType:
      'REPORT_EXPORTED',

    outcome:
      body.outcome,

    resource:
      body.resource.trim(),

    resourceId:
      typeof body.resourceId ===
        'string'
        ? body.resourceId.trim()
        : undefined,

    metadata:
      isRecord(body.metadata)
        ? body.metadata as
            ClientAuditEventRequest[
              'metadata'
            ]
        : undefined,
  };
}

export function createAuthRouter(): Router {
  const router =
    Router();

  router.get(
    '/status',

    async (
      _request,
      response,
      next,
    ) => {
      try {
        response.json(
          await getSecurityService()
            .getStatus(),
        );
      } catch (
        error: unknown
      ) {
        next(error);
      }
    },
  );

  router.post(
    '/bootstrap',

    async (
      request,
      response,
    ) => {
      try {
        const service =
          getSecurityService();

        const status =
          await service.getStatus();

        if (status.configured) {
          response
            .status(409)
            .json({
              error: {
                code:
                  'SECURITY_ALREADY_CONFIGURED',

                message:
                  [
                    'The first administrator',
                    'has already been created.',
                  ].join(' '),
              },
            });

          return;
        }

        const setupRequest =
          parseBootstrapRequest(
            request.body,
          );

        await createOperatorAccount(
          setupRequest.username,
          setupRequest.displayName,
          'ADMIN',
          setupRequest.password,
        );

        const result =
          await service.login(
            setupRequest.username,
            setupRequest.password,

            {
              clientAddress:
                request.ip ?? null,

              userAgent:
                request.get(
                  'user-agent',
                ) ?? null,
            },
          );

        response
          .status(201)
          .json(result);
      } catch (
        error: unknown
      ) {
        response
          .status(400)
          .json({
            error: {
              code:
                'SECURITY_BOOTSTRAP_FAILED',

              message:
                error instanceof Error
                  ? error.message
                  : 'Administrator setup failed.',
            },
          });
      }
    },
  );

  router.post(
    '/login',

    async (
      request,
      response,
    ) => {
      try {
        const credentials =
          parseLoginRequest(
            request.body,
          );

        const result =
          await getSecurityService()
            .login(
              credentials.username,
              credentials.password,

              {
                clientAddress:
                  request.ip ??
                  null,

                userAgent:
                  request.get(
                    'user-agent',
                  ) ??
                  null,
              },
            );

        response
          .status(200)
          .json(result);
      } catch (
        error: unknown
      ) {
        response
          .status(401)
          .json({
            error: {
              code:
                'LOGIN_FAILED',

              message:
                error instanceof
                  Error
                  ? error.message
                  : 'Login failed.',
            },
          });
      }
    },
  );

  return router;
}

export function createProtectedAuthRouter(): Router {
  const router =
    Router();

  router.get(
    '/session',

    (
      request,
      response,
    ) => {
      const context =
        getRequestSecurityContext(
          request,
        );

      response.json(
        context?.session ??
        null,
      );
    },
  );

  router.post(
    '/logout',

    async (
      request,
      response,
      next,
    ) => {
      try {
        const context =
          getRequestSecurityContext(
            request,
          );

        if (context) {
          await getSecurityService()
            .logout(
              context.accessToken,
              request.ip ??
              null,
            );
        }

        response.status(204).send();
      } catch (
        error: unknown
      ) {
        next(error);
      }
    },
  );

  return router;
}

export function createSecurityRouter(): Router {
  const router =
    Router();

  router.get(
    '/audit',

    requirePermission(
      'VIEW_AUDIT_LOGS',
    ),

    async (
      request,
      response,
      next,
    ) => {
      try {
        const suppliedLimit =
          typeof request.query
            .limit ===
            'string'
            ? Number(
                request.query
                  .limit,
              )
            : undefined;

        const eventTypes =
          parseAuditEventTypes(
            request.query
              .eventTypes,
          );

        response.json(
          await getSecurityService()
            .listAuditEntries({
              limit:
                suppliedLimit,

              eventTypes,
            }),
        );
      } catch (
        error: unknown
      ) {
        response.status(400).json({
          error: {
            code:
              'INVALID_REQUEST',

            message:
              error instanceof
                Error
                ? error.message
                : 'Invalid audit request.',
          },
        });
      }
    },
  );

  router.post(
    '/audit/events',

    async (
      request,
      response,
      next,
    ) => {
      try {
        const context =
          getRequestSecurityContext(
            request,
          );

        if (!context) {
          response.status(401).json({
            error: {
              code:
                'AUTHENTICATION_REQUIRED',

              message:
                'A valid operator session is required.',
            },
          });

          return;
        }

        const event =
          parseClientAuditEvent(
            request.body,
          );

        await getSecurityService()
          .recordClientEvent(
            context.session,
            event,
            request.ip ??
            null,
          );

        response
          .status(204)
          .send();
      } catch (
        error: unknown
      ) {
        next(error);
      }
    },
  );

  return router;
}
