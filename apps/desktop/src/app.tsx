import { ApiStatusCard } from "./components/ApiStatusCard";
import { SystemPanel } from "./components/SystemPanel";
import { CrimeRecordsPanel } from './components/CrimeRecordsPanel';
import {
  DashboardIntelligencePanel,
} from './components/DashboardIntelligencePanel';
import React from "react";
import { createRoot } from "react-dom/client";

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
      <p className="status-card__title">{title}</p>
      <strong className="status-card__value">{value}</strong>
      <p className="status-card__description">{description}</p>
    </article>
  );
}

function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__logo">K</div>

          <div>
            <h1>Kavach AI</h1>
            <p>Crime Intelligence</p>
          </div>
        </div>

        <nav className="navigation" aria-label="Main navigation">
          <button
            className="navigation__item navigation__item--active"
            type="button"
          >
            Dashboard
          </button>

          <button className="navigation__item" type="button">
            Crime Records
          </button>

          <button className="navigation__item" type="button">
            Hotspots
          </button>

          <button className="navigation__item" type="button">
            Analytics
          </button>

          <button className="navigation__item" type="button">
            Reports
          </button>
        </nav>

        <div className="sidebar__footer">
          <span className="status-dot" />
          Desktop foundation online
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="page-header__eyebrow">Kavach Intelligence Centre</p>
            <h2>Dashboard</h2>
            <p className="page-header__description">
              Monitor crime patterns, hotspots and predictive insights.
            </p>
          </div>

          <div className="phase-badge">PHASE 2 · DATA FOUNDATION</div>
        </header>

        <section className="status-grid" aria-label="Project status">
          <StatusCard
            title="Desktop client"
            value="Ready"
            description="Electron and React renderer are running."
          />

          <ApiStatusCard />
        </section>

        <DashboardIntelligencePanel />

        <CrimeRecordsPanel />

        <section className="content-grid">
          <article className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Foundation</p>
                <h3>Phase 1 progress</h3>
              </div>

              <span className="panel__badge panel__badge--complete">
                Foundation ready
              </span>
            </div>

            <div className="checklist">
              <div className="checklist__item checklist__item--complete">
                <span>1</span>
                Electron application initialized
              </div>

              <div className="checklist__item checklist__item--complete">
                <span>2</span>
                React renderer configured
              </div>

              <div className="checklist__item checklist__item--complete">
                <span>3</span>
                Secure preload bridge
              </div>

              <div className="checklist__item checklist__item--complete">
                <span>4</span>
                Backend health API
              </div>

              <div className="checklist__item checklist__item--complete">
                <span>5</span>
                Shared TypeScript contracts
              </div>
            </div>
          </article>

          <SystemPanel />
        </section>
      </main>
    </div>
  );
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Unable to find the React root element.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
