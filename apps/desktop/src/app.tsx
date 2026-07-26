import {
  useState,
} from 'react';

import React from 'react';

import {
  createRoot,
} from 'react-dom/client';

import {
  ApiStatusCard,
} from './components/ApiStatusCard';

import {
  CrimeRecordsPanel,
} from './components/CrimeRecordsPanel';

import {
  DashboardIntelligencePanel,
} from './components/DashboardIntelligencePanel';

import {
  PriorityQueuePanel,
} from './components/PriorityQueuePanel';

import {
  HotspotIntelligencePanel,
} from './components/HotspotIntelligencePanel';

import {
  AnalyticsIntelligencePanel,
} from './components/AnalyticsIntelligencePanel';

import {
  ReportsWorkspace,
} from './components/ReportsWorkspace';

import {
  SystemPanel,
} from './components/SystemPanel';

import {
  SecurityGate,
  useSecuritySession,
} from './components/SecurityGate';

import {
  AuditLogPanel,
} from './components/AuditLogPanel';

import {
  IntelligenceAssistantPanel,
} from './components/IntelligenceAssistantPanel';

type AppView =
  | 'dashboard'
  | 'records'
  | 'priority'
  | 'hotspots'
  | 'analytics'
  | 'reports'
  | 'security'
  | 'assistant';

interface ViewMetadata {
  eyebrow: string;
  title: string;
  description: string;
}

const VIEW_METADATA:
Readonly<
  Record<AppView, ViewMetadata>
> = {
  dashboard: {
    eyebrow:
      'Kavach Intelligence Centre',

    title:
      'Dashboard',

    description:
      'Monitor validated crime data, investigation activity and operational intelligence.',
  },

  records: {
    eyebrow:
      'Validated FIR Repository',

    title:
      'Crime Records',

    description:
      'Search and inspect registered cases, evidence, timelines, entities and investigation graphs.',
  },

  priority: {
    eyebrow:
      'Operational Intelligence',

    title:
      'Priority Queue',

    description:
      'Review evidence-referenced case priorities using transparent and bounded investigative signals.',
  },

  hotspots: {
    eyebrow:
      'Aggregate Spatial Intelligence',

    title:
      'Hotspots',

    description:
      'Pressure maps and spatio-temporal trends highlighting recurring crime locations and severity.',
  },

  analytics: {
    eyebrow:
      'Aggregate Investigation Analytics',

    title:
      'Analytics',

    description:
      'Compare crime trends, jurisdictions, investigation milestones, outcomes and recurring offence patterns.',
  },

  reports: {
    eyebrow:
      'Controlled Intelligence Export',

    title:
      'Reports',

    description:
      'Generate reviewable FIR, analytics and hotspot documents in PDF, HTML, JSON and CSV formats.',
  },

  security: {
    eyebrow:
      'Security and Accountability',

    title:
      'Audit Log',

    description:
      'Review authentication, authorization, resource access and controlled-export activity.',
  },

  assistant: {
    eyebrow:
      'Offline Retrieval-Grounded Intelligence',

    title:
      'Assistant',

    description:
      'Search synthetic FIR records using natural language and receive evidence-grounded answers with direct case citations.',
  },
};



function navigationClass(
  active:
    boolean,
): string {
  return [
    'navigation__item',
    active
      ? 'navigation__item--active'
      : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function App() {
  const [
    activeView,
    setActiveView,
  ] =
    useState<AppView>(
      'dashboard',
    );

  const {
    hasPermission,
  } =
    useSecuritySession();

  const metadata =
    VIEW_METADATA[activeView];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__logo">
            K
          </div>

          <div>
            <h1>Kavach AI</h1>

            <p>
              Crime Intelligence
            </p>
          </div>
        </div>

        <nav
          className="navigation"
          aria-label="Main navigation"
        >
          <button
            className={navigationClass(
              activeView ===
                'dashboard',
            )}
            type="button"
            onClick={() =>
              setActiveView(
                'dashboard',
              )
            }
          >
            Dashboard
          </button>

          {hasPermission(
            'VIEW_CASES',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'records',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'records',
                )
              }
            >
              Crime Records
            </button>
          )}

          {hasPermission(
            'VIEW_PRIORITY',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'priority',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'priority',
                )
              }
            >
              Priority Queue
            </button>
          )}

          {hasPermission(
            'VIEW_HOTSPOTS',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'hotspots',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'hotspots',
                )
              }
            >
              Hotspots
            </button>
          )}

          {hasPermission(
            'VIEW_ANALYTICS',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'analytics',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'analytics',
                )
              }
            >
              Analytics
            </button>
          )}

          {hasPermission(
            'EXPORT_REPORTS',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'reports',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'reports',
                )
              }
            >
              Reports
            </button>
          )}

          {hasPermission(
            'VIEW_AUDIT_LOGS',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'security',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'security',
                )
              }
            >
              Audit Log
            </button>
          )}

          {hasPermission(
            'VIEW_CASES',
          ) && (
            <button
              className={navigationClass(
                activeView ===
                  'assistant',
              )}
              type="button"
              onClick={() =>
                setActiveView(
                  'assistant',
                )
              }
            >
              Intelligence Assistant
            </button>
          )}
        </nav>

        <div className="sidebar__footer">
          <span className="status-dot" />

          Operational data link online
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="page-header__eyebrow">
              {metadata.eyebrow}
            </p>

            <h2>
              {metadata.title}
            </h2>

            <p className="page-header__description">
              {metadata.description}
            </p>
          </div>

          <div className="phase-badge">
            PHASE 2 · OPERATIONAL
            INTELLIGENCE
          </div>
        </header>

        {activeView ===
          'dashboard' && (
          <div className="page-view">
            <DashboardIntelligencePanel />
          </div>
        )}

        {activeView ===
          'records' && (
          <div className="page-view">
            <CrimeRecordsPanel />
          </div>
        )}

        {activeView ===
          'priority' && (
          <div className="page-view">
            <PriorityQueuePanel />
          </div>
        )}

        {activeView ===
          'hotspots' && (
          <div className="page-view">
            <HotspotIntelligencePanel />
          </div>
        )}

        {activeView ===
          'analytics' && (
          <div className="page-view">
            <AnalyticsIntelligencePanel />
          </div>
        )}

        {activeView ===
          'reports' && (
          <div className="page-view">
            <ReportsWorkspace />
          </div>
        )}

        {activeView ===
          'security' && (
          <div className="page-view">
            <AuditLogPanel />
          </div>
        )}

        {activeView ===
          'assistant' && (
          <div className="page-view">
            <IntelligenceAssistantPanel />
          </div>
        )}
      </main>
    </div>
  );
}

const rootElement =
  document.getElementById(
    'root',
  );

if (!rootElement) {
  throw new Error(
    'Unable to find the React root element.',
  );
}

createRoot(
  rootElement,
).render(
  <React.StrictMode>
    <SecurityGate>
      <App />
    </SecurityGate>
  </React.StrictMode>,
);

