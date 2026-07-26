import type {
  OperatorRole,
} from '@kavach/shared-types';

import {
  createOperatorAccount,
} from './security-service';

const ALLOWED_ROLES =
  new Set<OperatorRole>([
    'ADMIN',
    'SUPERVISOR',
    'INVESTIGATOR',
    'ANALYST',
    'AUDITOR',
  ]);

function readArgument(
  name: string,
): string | null {
  const argumentPrefix =
    `--${name}=`;

  const inline =
    process.argv.find(
      (argument) =>
        argument.startsWith(
          argumentPrefix,
        ),
    );

  if (inline) {
    return inline.slice(
      argumentPrefix.length,
    );
  }

  const index =
    process.argv.indexOf(
      `--${name}`,
    );

  if (
    index >= 0
  ) {
    return (
      process.argv[
        index + 1
      ] ??
      null
    );
  }

  return null;
}

async function main(): Promise<void> {
  const username =
    readArgument(
      'username',
    );

  const displayName =
    readArgument(
      'display-name',
    );

  const suppliedRole =
    readArgument(
      'role',
    )?.toUpperCase();

  const password =
    process.env
      .KAVACH_NEW_OPERATOR_PASSWORD;

  if (
    !username ||
    !displayName ||
    !suppliedRole ||
    !password
  ) {
    throw new Error(
      [
        'Required values:',
        '--username,',
        '--display-name,',
        '--role and',
        'KAVACH_NEW_OPERATOR_PASSWORD.',
      ].join(' '),
    );
  }

  const role =
    suppliedRole as
      OperatorRole;

  if (
    !ALLOWED_ROLES.has(
      role,
    )
  ) {
    throw new Error(
      [
        'Role must be one of:',
        [...ALLOWED_ROLES]
          .join(', '),
      ].join(' '),
    );
  }

  const operator =
    await createOperatorAccount(
      username,
      displayName,
      role,
      password,
    );

  console.log('');

  console.log(
    'KAVACH OPERATOR CREATED',
  );

  console.log(
    `Username: ${operator.username}`,
  );

  console.log(
    `Display name: ${operator.displayName}`,
  );

  console.log(
    `Role: ${operator.role}`,
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'OPERATOR CREATION FAILED',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
