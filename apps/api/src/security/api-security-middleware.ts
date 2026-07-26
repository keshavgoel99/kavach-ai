import {
  randomUUID,
} from 'node:crypto';

import type {
  RequestHandler,
} from 'express';

export const applyApiSecurityHeaders:
RequestHandler = (
  request,
  response,
  next,
) => {
  const requestId =
    randomUUID();

  response.setHeader(
    'x-request-id',
    requestId,
  );

  response.setHeader(
    'x-content-type-options',
    'nosniff',
  );

  response.setHeader(
    'x-frame-options',
    'DENY',
  );

  response.setHeader(
    'referrer-policy',
    'no-referrer',
  );

  response.setHeader(
    'permissions-policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
    ].join(', '),
  );

  response.setHeader(
    'cross-origin-resource-policy',
    'same-origin',
  );

  response.setHeader(
    'cross-origin-opener-policy',
    'same-origin',
  );

  response.setHeader(
    'cache-control',
    [
      'no-store',
      'no-cache',
      'must-revalidate',
      'private',
    ].join(', '),
  );

  response.setHeader(
    'pragma',
    'no-cache',
  );

  response.setHeader(
    'expires',
    '0',
  );

  response.locals.requestId =
    requestId;

  next();
};
