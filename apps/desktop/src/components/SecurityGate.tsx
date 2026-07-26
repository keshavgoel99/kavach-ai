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
import logoFull from '../assets/logo-full.png';

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
    sessionMessage,
    setSessionMessage,
  ] =
    useState<string | null>(
      null,
    );

  const [
    loggingIn,
    setLoggingIn,
  ] =
    useState(false);

  const [
    displayName,
    setDisplayName,
  ] =
    useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState('');

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    setupError,
    setSetupError,
  ] =
    useState<string | null>(null);

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

  useEffect(() => {
    const unsubscribe =
      window.kavach.security
        .onSessionExpired(
          () => {
            setSession(null);

            setPassword('');

            setSessionMessage(
              [
                'Your secure session expired',
                'or is no longer valid.',
                'Sign in again to continue.',
              ].join(' '),
            );
          },
        );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!session) {
      return undefined;
    }

    let active = true;

    const validateSession =
      async (): Promise<void> => {
        try {
          const currentSession =
            await window.kavach
              .security
              .getSession();

          if (!active) {
            return;
          }

          if (!currentSession) {
            setSession(null);

            setSessionMessage(
              [
                'Your secure session expired.',
                'Sign in again to continue.',
              ].join(' '),
            );

            return;
          }

          setSession(
            currentSession,
          );
        } catch {
          if (active) {
            setSession(null);

            setSessionMessage(
              'Your secure session could not be validated.',
            );
          }
        }
      };

    const interval =
      window.setInterval(
        () => {
          void validateSession();
        },
        60_000,
      );

    return () => {
      active = false;

      window.clearInterval(
        interval,
      );
    };
  }, [
    session?.sessionId,
  ]);

  async function bootstrapAdministrator(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setSubmitting(true);
    setSetupError(null);

    try {
      if (password !== confirmPassword) {
        throw new Error('The passwords do not match.');
      }

      const authenticatedSession =
        await window.kavach
          .security
          .bootstrapAdministrator({
            username,
            displayName,
            password,
          });

      setSession(authenticatedSession);
      setPhase('authenticated');

      setPassword('');
      setConfirmPassword('');
      setSessionMessage(null);
    } catch (error: unknown) {
      setSetupError(
        error instanceof Error
          ? error.message
          : 'Administrator setup failed.',
      );
    } finally {
      setSubmitting(false);
    }
  }

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

      setSessionMessage(null);
      setPassword('');

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
            <img src={logoFull} alt="Kavach AI" className="brand__logo-image" style={{ margin: '0 auto 24px' }} />
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
        <form
          className="security-gate__card security-setup"
          onSubmit={bootstrapAdministrator}
        >
          <div className="security-gate__brand">
            <img src={logoFull} alt="Kavach AI" className="brand__logo-image" style={{ margin: '0 auto 24px' }} />
          </div>

          <div className="security-gate__notice">
            <span className="security-gate__notice-eyebrow">
              KAVACH AI · FIRST-RUN SECURITY
            </span>

            <h2>Create administrator</h2>

            <p style={{ marginTop: '12px' }}>
              Create the first local operator.
              This account receives administrative
              permissions and can provision
              additional operators later.
            </p>
          </div>

          <label className="security-gate__label" style={{ marginTop: '24px' }}>
            <span>Administrator username</span>
            <input
              className="security-gate__input"
              autoFocus
              autoComplete="username"
              value={username}
              disabled={submitting}
              onChange={(event) =>
                setUsername(event.target.value)
              }
            />
          </label>

          <label className="security-gate__label">
            <span>Display name</span>
            <input
              className="security-gate__input"
              autoComplete="name"
              value={displayName}
              disabled={submitting}
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
            />
          </label>

          <label className="security-gate__label">
            <span>Administrator password</span>
            <input
              className="security-gate__input"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={submitting}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </label>

          <label className="security-gate__label">
            <span>Confirm password</span>
            <input
              className="security-gate__input"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={submitting}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
            />
          </label>

          <small className="security-setup__requirement">
            Use at least 12 characters.
            The password is never stored
            in plain text.
          </small>

          {setupError && (
            <div
              className="security-gate__error"
              role="alert"
            >
              {setupError}
            </div>
          )}

          <button
            className="security-gate__submit"
            type="submit"
            style={{ marginTop: '24px' }}
            disabled={
              submitting ||
              !username.trim() ||
              !displayName.trim() ||
              !password ||
              !confirmPassword
            }
          >
            {submitting
              ? 'Creating administrator…'
              : 'Create secure workspace'}
          </button>
        </form>
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
            <img src={logoFull} alt="Kavach AI" className="brand__logo-image" style={{ margin: '0 auto 24px' }} />
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

            {sessionMessage && (
              <div className="security-login__notice">
                {sessionMessage}
              </div>
            )}

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
