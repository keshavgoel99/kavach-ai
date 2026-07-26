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
  SystemPanel,
} from './components/SystemPanel';

type AppView =
  | 'dashboard'
  | 'records'
  | 'priority'
  | 'hotspots';

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
      'Review historical crime concentration, location trends and graph-linked operational context.',
  },
};

function StatusCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <article className="status-card">
      <p className="status-card__title">
        {title}
      </p>

      <strong className="status-card__value">
        {value}
      </strong>

      <p className="status-card__description">
        {description}
      </p>
    </article>
  );
}

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

          <button
            className="navigation__item"
            type="button"
            disabled
            title="Analytics is scheduled for a later checkpoint."
          >
            Analytics
          </button>

          <button
            className="navigation__item"
            type="button"
            disabled
            title="Reports are scheduled for a later checkpoint."
          >
            Reports
          </button>
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
            <section
              className="status-grid"
              aria-label="Project status"
            >
              <StatusCard
                title="Desktop client"
                value="Ready"
                description="Electron and React renderer are operational."
              />

              <ApiStatusCard />

              <StatusCard
                title="Priority engine"
                value="Active"
                description="Explainable case-review assessments are available."
              />
            </section>

            <DashboardIntelligencePanel />

            <section className="content-grid">
              <article className="panel">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">
                      Investigation Platform
                    </p>

                    <h3>
                      Operational capability
                    </h3>
                  </div>

                  <span className="panel__badge panel__badge--complete">
                    Intelligence active
                  </span>
                </div>

                <div className="checklist">
                  <div className="checklist__item checklist__item--complete">
                    <span>1</span>

                    Validated FIR repository
                  </div>

                  <div className="checklist__item checklist__item--complete">
                    <span>2</span>

                    Canonical entity intelligence
                  </div>

                  <div className="checklist__item checklist__item--complete">
                    <span>3</span>

                    Evidence-backed investigation graph
                  </div>

                  <div className="checklist__item checklist__item--complete">
                    <span>4</span>

                    Explainable case priority engine
                  </div>

                  <div className="checklist__item checklist__item--complete">
                    <span>5</span>

                    Secure Electron API boundary
                  </div>
                </div>
              </article>

              <SystemPanel />
            </section>
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
    <App />
  </React.StrictMode>,
);
