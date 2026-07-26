import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import React from 'react';

import type {
  AuthSession,
  SecurityPermission,
} from '@kavach/shared-types';

import './SecurityGate.css';

type GatePhase =
  | 'checking'
  | 'unconfigured'
  | 'login'
  | 'authenticated';

interface SecuritySessionContext {
  session:
    AuthSession | null;

  hasPermission(
    permission:
      SecurityPermission,
  ): boolean;
}

const SecurityContext =
  createContext<
    SecuritySessionContext
  >({
    session: null,

    hasPermission: () => false,
  });

export function useSecuritySession(): SecuritySessionContext {
  return useContext(
    SecurityContext,
  );
}

export function SecurityGate({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    phase,
    setPhase,
  ] =
    useState<GatePhase>(
      'checking',
    );

  const [
    session,
    setSession,
  ] =
    useState<AuthSession | null>(
      null,
    );

  const [
    username,
    setUsername,
  ] =
    useState('');

  const [
    password,
    setPassword,
  ] =
    useState('');

  const [
    loginError,
    setLoginError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    loggingIn,
    setLoggingIn,
  ] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function checkAuth():
    Promise<void> {
      try {
        const status =
          await window.kavach
            .security
            .getStatus();

        if (!active) return;

        if (!status.configured) {
          setPhase(
            'unconfigured',
          );

          return;
        }

        const existing =
          await window.kavach
            .security
            .getSession();

        if (!active) return;

        if (existing) {
          setSession(existing);

          setPhase(
            'authenticated',
          );
        } else {
          setPhase('login');
        }
      } catch {
        if (active) {
          setPhase('login');
        }
      }
    }

    void checkAuth();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogin(
    event:
      React.FormEvent,
  ): Promise<void> {
    event.preventDefault();

    setLoggingIn(true);
    setLoginError(null);

    try {
      const result =
        await window.kavach
          .security
          .login({
            username:
              username.trim(),

            password,
          });

      setSession(result);

      setPhase(
        'authenticated',
      );
    } catch (
      error: unknown
    ) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Authentication failed.',
      );
    } finally {
      setLoggingIn(false);
    }
  }

  if (
    phase === 'checking'
  ) {
    return (
      <div className="security-gate">
        <div className="security-gate__card">
          <div className="security-gate__brand">
            <div className="security-gate__logo">
              K
            </div>

            <h1>
              Kavach AI
            </h1>
          </div>

          <p className="security-gate__checking">
            Verifying operator session…
          </p>
        </div>
      </div>
    );
  }

  if (
    phase === 'unconfigured'
  ) {
    return (
      <div className="security-gate">
        <div className="security-gate__card">
          <div className="security-gate__brand">
            <div className="security-gate__logo">
              K
            </div>

            <h1>
              Kavach AI
            </h1>
          </div>

          <div className="security-gate__notice">
            <span className="security-gate__notice-eyebrow">
              INITIAL SETUP REQUIRED
            </span>

            <p>
              No operator accounts have been
              configured. Run the operator
              creation command on the API
              server to get started.
            </p>

            <code className="security-gate__command">
              npm run security:create-operator
              -- --username admin
              --display-name &quot;Admin&quot;
              --role ADMIN
            </code>
          </div>
        </div>
      </div>
    );
  }

  if (
    phase === 'login'
  ) {
    return (
      <div className="security-gate">
        <div className="security-gate__card">
          <div className="security-gate__brand">
            <div className="security-gate__logo">
              K
            </div>

            <h1>
              Kavach AI
            </h1>
          </div>

          <span className="security-gate__eyebrow">
            OPERATOR AUTHENTICATION
          </span>

          <p className="security-gate__subtitle">
            Sign in to access the
            intelligence platform.
          </p>

          <form
            className="security-gate__form"
            onSubmit={(event) => {
              void handleLogin(
                event,
              );
            }}
          >
            <label>
              <span>
                Username
              </span>

              <input
                type="text"
                autoFocus
                autoComplete="username"
                spellCheck={false}
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Password
              </span>

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            {loginError && (
              <div className="security-gate__error">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={
                loggingIn ||
                !username.trim() ||
                !password
              }
            >
              {loggingIn
                ? 'Authenticating…'
                : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const contextValue:
    SecuritySessionContext = {
    session,

    hasPermission: (
      permission,
    ) =>
      session?.permissions
        .includes(
          permission,
        ) ??
      false,
  };

  return (
    <SecurityContext.Provider
      value={contextValue}
    >
      {children}
    </SecurityContext.Provider>
  );
}
