import { useState, useEffect } from "react";
import type { NetworkLog, SecurityAlert, SecurityEvent } from "@monitoring/shared";

import { AccessTimelineChart } from "./components/AccessTimelineChart";
import { AlertsList } from "./components/AlertsList";
import { CategoryBarChart } from "./components/CategoryBarChart";
import { DevicesPanel } from "./components/DevicesPanel";
import { LogsTable } from "./components/LogsTable";
import { MetricCard } from "./components/MetricCard";
import { SeverityDonutChart } from "./components/SeverityDonutChart";
import { SimulationEventsPanel } from "./components/SimulationEventsPanel";
import { TopSourcesChart } from "./components/TopSourcesChart";
import { TrafficChart } from "./components/TrafficChart";
import { useDashboardData } from "./hooks/useDashboardData";

/* ── Types ──────────────────────────────────────────────── */
type PageId = "dashboard" | "alerts" | "logs" | "graphs" | "devices" | "access";
type AlertFilter = "all" | SecurityAlert["severity"];
type LogCategoryFilter = "all" | NetworkLog["category"];
type LogSeverityFilter = "all" | NetworkLog["severity"];
type GraphFilter = "all" | "traffic" | "severity" | "categories" | "sources" | "access";
type DeviceFilter = "all" | "healthy" | "warning" | "critical";
type AccessFilter = "all" | "access" | "logins" | "blocked";

const accentMap = ["#00bceb", "#ff4d6d", "#ff9e00", "#34d399", "#8b5cf6"];

/* ── Page definitions ───────────────────────────────────── */
const pages: Array<{
  id: PageId;
  label: string;
  icon: string;
  eyebrow: string;
  title: string;
  desc: string;
}> = [
  { id: "dashboard", label: "Dashboard",   icon: "📊", eyebrow: "Mission Control",      title: "Real-time visibility for Cisco infrastructure and cloud-connected security events.",   desc: "Overview metrics, traffic trends, and top-priority alerts at a glance." },
  { id: "alerts",    label: "Alerts",       icon: "🔔", eyebrow: "Notification Center",   title: "High-signal detections collected into a dedicated alert workspace.",                    desc: "Filter by severity, review suggested actions, and triage detections." },
  { id: "logs",      label: "Logs",         icon: "📋", eyebrow: "Event Stream",           title: "Live event stream with operator-grade filters and search context.",                      desc: "Inspect the raw CloudWatch-backed log feed by category, severity, and device." },
  { id: "graphs",    label: "Graphs",       icon: "📈", eyebrow: "Telemetry",             title: "Trend analysis and visual breakdowns across traffic, severity, categories, and access.", desc: "Focus on individual chart families or view the complete analytics grid." },
  { id: "devices",   label: "Devices",      icon: "🖥️", eyebrow: "Infrastructure",         title: "Collector, firewall, router, and cloud workload health at a glance.",                    desc: "Filter by health status so warnings and critical assets surface immediately." },
  { id: "access",    label: "Access",       icon: "🔐", eyebrow: "Audit Trail",           title: "User identity, session behavior, and structured access events.",                         desc: "Review who accessed protected resources and how sessions behaved." },
];

/* ── Helpers ─────────────────────────────────────────────── */
function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatEventType(type: SecurityEvent["eventType"]) {
  return type.replaceAll("_", " ");
}

function buildCountMap(items: string[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ── Cisco Shield Icon ──────────────────────────────────── */
function CiscoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
      <path d="M12 22V12" />
      <path d="M3 7l9 5 9-5" />
    </svg>
  );
}

/* ── SubTab Component ───────────────────────────────────── */
function SubTabs<T extends string>({
  items,
  active,
  onChange,
}: {
  items: Array<{ id: T; label: string; count?: number }>;
  active: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="sub-tabs">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`sub-tab ${active === item.id ? "sub-tab--active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          <span>{item.label}</span>
          {item.count !== undefined && <span className="sub-tab__count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Alert Notifications Panel ──────────────────────────── */
function AlertNotifications({ alerts }: { alerts: SecurityAlert[] }) {
  return (
    <section className="panel panel--fixed" style={{ background: "rgba(255,255,255,0.03)" }}>
      <div className="panel__header">
        <h2>Alert Feed</h2>
        <span>{alerts.length} active</span>
      </div>
      <div className="card-list card-list--scroll">
        {alerts.length === 0 ? (
          <p className="empty-state">No alerts in this filter.</p>
        ) : (
          alerts.slice(0, 6).map((a) => (
            <article key={a.id} className={`notification-card notification-card--${a.severity}`}>
              <div className="notification-card__top">
                <span className={`badge badge--${a.severity}`}>{a.severity}</span>
                <span>{formatTime(a.detectedAt)}</span>
              </div>
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              <small>Device <strong>{a.deviceName}</strong></small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

/* ── Summary Panel ──────────────────────────────────────── */
function SummaryPanel({ title, subtitle, rows }: {
  title: string;
  subtitle: string;
  rows: Array<{ label: string; value: string | number }>;
}) {
  return (
    <section className="panel summary-panel">
      <div className="panel__header">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="summary-list">
        {rows.map((r) => (
          <div key={r.label} className="summary-list__row">
            <span>{r.label}</span>
            <strong>{r.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Activity Panel ─────────────────────────────────────── */
function ActivityPanel({ title, subtitle, items }: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; meta: string; tone?: "default" | "alert" }>;
}) {
  return (
    <section className="panel summary-panel">
      <div className="panel__header">
        <h2>{title}</h2>
        <span>{subtitle}</span>
      </div>
      <div className="activity-list">
        {items.length === 0 ? (
          <p className="empty-state">Nothing to show yet.</p>
        ) : (
          items.map((item) => (
            <div key={`${item.label}-${item.meta}`} className={`activity-list__item ${item.tone === "alert" ? "activity-list__item--alert" : ""}`}>
              <strong>{item.label}</strong>
              <span>{item.meta}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGE COMPONENTS
   ══════════════════════════════════════════════════════════ */

/* ── Dashboard Page ─────────────────────────────────────── */
function DashboardPage({ data }: { data: any }) {
  const overviewCards = [
    { label: "Total Logs",           value: data.overview.totalLogs,         icon: "LG" },
    { label: "High Severity Alerts", value: data.overview.highSeverityAlerts, icon: "AL" },
    { label: "Blocked Attempts",     value: data.overview.blockedAttempts,    icon: "BL" },
    { label: "Active Devices",       value: data.overview.activeDevices,      icon: "DV" },
    { label: "Structured Events",    value: data.overview.structuredEvents,   icon: "EV" },
  ];

  const accessEvents = data.events.filter((e: SecurityEvent) =>
    ["successful_login", "authenticated_access", "session_logout"].includes(e.eventType)
  );
  const eventTypeCounts = buildCountMap(data.events.map((e: SecurityEvent) => formatEventType(e.eventType))).slice(0, 5);
  const recentAccess = accessEvents.slice(0, 5).map((e: SecurityEvent) => ({
    label: `${e.actor} → ${e.targetPath}`,
    meta: `${e.status} at ${formatTime(e.timestamp)}`,
    tone: e.status === "blocked" ? ("alert" as const) : ("default" as const),
  }));

  return (
    <>
      <div className="quick-actions">
        <a className="action-btn action-btn--primary" href="http://127.0.0.1:4300" target="_blank" rel="noreferrer">
          🔒 Open Secured Portal
        </a>
        <a className="action-btn action-btn--secondary" href="http://127.0.0.1:4400" target="_blank" rel="noreferrer">
          ⚡ Open Traffic Simulator
        </a>
      </div>

      <section className="metrics-grid">
        {overviewCards.map((card, i) => (
          <MetricCard key={card.label} label={card.label} value={card.value} accent={accentMap[i]} icon={card.icon} />
        ))}
      </section>

      <div className="content-grid">
        <div className="content-main">
          <div className="graph-grid graph-grid--dashboard">
            <TrafficChart data={data.traffic} />
            <SeverityDonutChart logs={data.logs} />
          </div>
        </div>
        <div className="content-aside">
          <AlertNotifications alerts={data.alerts} />
        </div>
      </div>

      <div className="content-grid">
        <div className="content-main">
          <SummaryPanel
            title="Event Mix"
            subtitle="Security event types"
            rows={eventTypeCounts.map(([label, value]) => ({ label, value }))}
          />
        </div>
        <div className="content-aside">
          <ActivityPanel title="Latest Access" subtitle="Recent user activity" items={recentAccess} />
        </div>
      </div>
    </>
  );
}

/* ── Alerts Page ────────────────────────────────────────── */
function AlertsPage({ data }: { data: any }) {
  const [filter, setFilter] = useState<AlertFilter>("all");
  const filtered = data.alerts.filter((a: SecurityAlert) => filter === "all" || a.severity === filter);

  const tabs = [
    { id: "all" as const,      label: "All",      count: data.alerts.length },
    { id: "critical" as const, label: "Critical", count: data.alerts.filter((a: SecurityAlert) => a.severity === "critical").length },
    { id: "high" as const,     label: "High",     count: data.alerts.filter((a: SecurityAlert) => a.severity === "high").length },
    { id: "medium" as const,   label: "Medium",   count: data.alerts.filter((a: SecurityAlert) => a.severity === "medium").length },
    { id: "low" as const,      label: "Low",      count: data.alerts.filter((a: SecurityAlert) => a.severity === "low").length },
  ];

  const summaryRows = [
    { label: "Critical", value: tabs[1].count },
    { label: "High",     value: tabs[2].count },
    { label: "Medium",   value: tabs[3].count },
    { label: "Low",      value: tabs[4].count },
  ];

  return (
    <>
      <SubTabs items={tabs} active={filter} onChange={setFilter} />
      <div className="content-grid">
        <div className="content-main">
          <AlertsList alerts={filtered} />
        </div>
        <div className="content-aside">
          <AlertNotifications alerts={filtered} />
          <SummaryPanel title="Alert Summary" subtitle="Current filter" rows={summaryRows} />
          <ActivityPanel
            title="Latest Detections"
            subtitle="Recent alerts"
            items={filtered.slice(0, 4).map((a: SecurityAlert) => ({
              label: a.deviceName,
              meta: `${a.ruleId} at ${formatTime(a.detectedAt)}`,
              tone: a.severity === "critical" ? "alert" : "default",
            }))}
          />
        </div>
      </div>
    </>
  );
}

/* ── Logs Page ──────────────────────────────────────────── */
function LogsPage({ data }: { data: any }) {
  const [category, setCategory] = useState<LogCategoryFilter>("all");
  const [severity, setSeverity] = useState<LogSeverityFilter>("all");
  const [device, setDevice] = useState("all");

  const filtered = data.logs.filter((l: NetworkLog) => {
    if (category !== "all" && l.category !== category) return false;
    if (severity !== "all" && l.severity !== severity) return false;
    if (device !== "all" && l.deviceName !== device) return false;
    return true;
  });

  const categoryTabs = [
    { id: "all" as const,     label: "All Logs", count: data.logs.length },
    { id: "auth" as const,    label: "Auth",     count: data.logs.filter((l: NetworkLog) => l.category === "auth").length },
    { id: "acl" as const,     label: "ACL",      count: data.logs.filter((l: NetworkLog) => l.category === "acl").length },
    { id: "traffic" as const, label: "Traffic",  count: data.logs.filter((l: NetworkLog) => l.category === "traffic").length },
    { id: "config" as const,  label: "Config",   count: data.logs.filter((l: NetworkLog) => l.category === "config").length },
    { id: "system" as const,  label: "System",   count: data.logs.filter((l: NetworkLog) => l.category === "system").length },
  ];

  const categoryCounts = buildCountMap(filtered.map((l: NetworkLog) => l.category));
  const topSources = buildCountMap(filtered.map((l: NetworkLog) => l.sourceIp)).slice(0, 4);
  const deviceOptions: string[] = ["all", ...Array.from(new Set(data.logs.map((l: NetworkLog) => l.deviceName))) as string[]];

  return (
    <>
      <SubTabs items={categoryTabs} active={category} onChange={setCategory} />
      <div className="content-grid content-grid--reversed">
        <div className="content-aside">
          <section className="panel summary-panel">
            <div className="panel__header">
              <h2>Filters</h2>
              <span>Sidebar</span>
            </div>
            <div className="filter-group">
              <p>Severity</p>
              <div className="filter-chips">
                {(["all", "critical", "high", "medium", "low"] as const).map((opt) => (
                  <button key={opt} type="button" className={`filter-chip ${severity === opt ? "filter-chip--active" : ""}`} onClick={() => setSeverity(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="filter-group">
              <p>Device</p>
              <select className="filter-select" value={device} onChange={(e) => setDevice(e.target.value)}>
                {deviceOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </section>
          <SummaryPanel
            title="Category Breakdown"
            subtitle={`${filtered.length} visible`}
            rows={categoryCounts.slice(0, 5).map(([label, value]) => ({ label, value }))}
          />
          <ActivityPanel
            title="Top Sources"
            subtitle="By event count"
            items={topSources.map(([label, value]) => ({ label, meta: `${value} events` }))}
          />
        </div>
        <div className="content-main">
          <LogsTable logs={filtered} />
        </div>
      </div>
    </>
  );
}

/* ── Graphs Page ────────────────────────────────────────── */
function GraphsPage({ data }: { data: any }) {
  const [filter, setFilter] = useState<GraphFilter>("all");

  const tabs = [
    { id: "all" as const,        label: "All Charts" },
    { id: "traffic" as const,    label: "Traffic" },
    { id: "severity" as const,   label: "Severity" },
    { id: "categories" as const, label: "Categories" },
    { id: "sources" as const,    label: "Sources" },
    { id: "access" as const,     label: "Access" },
  ];

  const charts: Record<Exclude<GraphFilter, "all">, JSX.Element> = {
    traffic:    <TrafficChart data={data.traffic} />,
    severity:   <SeverityDonutChart logs={data.logs} />,
    categories: <CategoryBarChart logs={data.logs} />,
    sources:    <TopSourcesChart logs={data.logs} />,
    access:     <AccessTimelineChart events={data.events} />,
  };

  return (
    <>
      <SubTabs items={tabs} active={filter} onChange={setFilter} />
      <div className="content-grid content-grid--single">
        <div className="content-main">
          {filter === "all" ? (
            <div className="graph-grid">
              {charts.traffic}
              {charts.severity}
              {charts.categories}
              {charts.sources}
              <div style={{ gridColumn: "1 / -1" }}>{charts.access}</div>
            </div>
          ) : (
            <div className="graph-grid graph-grid--single">
              {charts[filter]}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Devices Page ───────────────────────────────────────── */
function DevicesPage({ data }: { data: any }) {
  const [filter, setFilter] = useState<DeviceFilter>("all");
  const filtered = data.devices.filter((d: any) => filter === "all" || d.health === filter);

  const tabs = [
    { id: "all" as const,      label: "All",      count: data.devices.length },
    { id: "healthy" as const,  label: "Healthy",  count: data.devices.filter((d: any) => d.health === "healthy").length },
    { id: "warning" as const,  label: "Warning",  count: data.devices.filter((d: any) => d.health === "warning").length },
    { id: "critical" as const, label: "Critical", count: data.devices.filter((d: any) => d.health === "critical").length },
  ];

  const healthCounts = buildCountMap(data.devices.map((d: any) => d.health));
  const mostRecent = [...data.devices].sort((a: any, b: any) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 5).map((d: any) => ({
    label: d.name,
    meta: `Last seen ${formatTime(d.lastSeen)}`,
  }));

  return (
    <>
      <SubTabs items={tabs} active={filter} onChange={setFilter} />
      <div className="content-grid">
        <div className="content-main">
          <DevicesPanel devices={filtered} />
        </div>
        <div className="content-aside">
          <SummaryPanel title="Health Snapshot" subtitle="Counts" rows={healthCounts.map(([l, v]) => ({ label: l, value: v }))} />
          <ActivityPanel title="Recently Seen" subtitle="Latest check-ins" items={mostRecent} />
          <SummaryPanel
            title="By Type"
            subtitle="Infrastructure"
            rows={[
              { label: "Routers",    value: data.devices.filter((d: any) => d.type === "router").length },
              { label: "Firewalls",  value: data.devices.filter((d: any) => d.type === "firewall").length },
              { label: "Collectors", value: data.devices.filter((d: any) => d.type === "collector").length },
            ]}
          />
        </div>
      </div>
    </>
  );
}

/* ── Access Page ────────────────────────────────────────── */
function AccessPage({ data }: { data: any }) {
  const [filter, setFilter] = useState<AccessFilter>("all");

  const filtered = data.events.filter((e: SecurityEvent) => {
    if (filter === "all") return true;
    if (filter === "blocked") return e.status === "blocked";
    if (filter === "logins") return ["successful_login", "failed_login_attempt", "failed_login_burst"].includes(e.eventType);
    return ["authenticated_access", "session_logout", "successful_login"].includes(e.eventType);
  });

  const accessEvents = data.events.filter((e: SecurityEvent) =>
    ["successful_login", "authenticated_access", "session_logout"].includes(e.eventType)
  );
  const eventTypeCounts = buildCountMap(data.events.map((e: SecurityEvent) => formatEventType(e.eventType))).slice(0, 5);
  const topActors = buildCountMap(accessEvents.map((e: SecurityEvent) => e.actor)).slice(0, 5).map(([label, value]) => ({
    label,
    meta: `${value} recorded actions`,
  }));
  const recentAccess = filtered.slice(0, 5).map((e: SecurityEvent) => ({
    label: `${e.actor} → ${e.targetPath}`,
    meta: `${e.status} at ${formatTime(e.timestamp)}`,
    tone: e.status === "blocked" ? ("alert" as const) : ("default" as const),
  }));

  const tabs = [
    { id: "all" as const,     label: "All Events", count: data.events.length },
    { id: "access" as const,  label: "Access",     count: accessEvents.length },
    { id: "logins" as const,  label: "Logins",     count: data.events.filter((e: SecurityEvent) => ["successful_login", "failed_login_attempt", "failed_login_burst"].includes(e.eventType)).length },
    { id: "blocked" as const, label: "Blocked",    count: data.events.filter((e: SecurityEvent) => e.status === "blocked").length },
  ];

  return (
    <>
      <SubTabs items={tabs} active={filter} onChange={setFilter} />
      <div className="content-grid">
        <div className="content-main">
          <SimulationEventsPanel events={filtered} />
        </div>
        <div className="content-aside">
          <ActivityPanel title="Access Trail" subtitle="Recent actors" items={recentAccess} />
          <ActivityPanel title="Top Identities" subtitle="Most active" items={topActors} />
          <SummaryPanel title="Event Types" subtitle="DynamoDB" rows={eventTypeCounts.map(([l, v]) => ({ label: l, value: v }))} />
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN APP
   ══════════════════════════════════════════════════════════ */
function App() {
  const { data, loading, error } = useDashboardData();
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const clock = useLiveClock();

  if (loading) {
    return (
      <main className="loading-shell">
        <div className="loading-spinner" />
        <span>Connecting to secure monitoring API…</span>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="error-shell">
        <div className="panel error-card">
          <h1>Dashboard unavailable</h1>
          <p>{error ?? "No data returned by the API."}</p>
        </div>
      </main>
    );
  }

  const currentPage = pages.find((p) => p.id === activePage) ?? pages[0];

  let pageContent: JSX.Element;
  switch (activePage) {
    case "alerts":  pageContent = <AlertsPage data={data} />;  break;
    case "logs":    pageContent = <LogsPage data={data} />;    break;
    case "graphs":  pageContent = <GraphsPage data={data} />;  break;
    case "devices": pageContent = <DevicesPage data={data} />; break;
    case "access":  pageContent = <AccessPage data={data} />;  break;
    default:        pageContent = <DashboardPage data={data} />;
  }

  return (
    <>
      {/* ── Navbar ────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar__brand">
          <div className="navbar__logo">
            <CiscoIcon />
          </div>
          <div className="navbar__title">
            <span>Cisco</span> + AWS
          </div>
        </div>

        <div className="navbar__links">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={`nav-link ${activePage === page.id ? "nav-link--active" : ""}`}
              onClick={() => setActivePage(page.id)}
            >
              <span className="nav-link__icon">{page.icon}</span>
              <span>{page.label}</span>
              {page.id === "alerts" && data.alerts.length > 0 && (
                <span className="nav-link__badge">{data.alerts.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="navbar__right">
          <div className="navbar__status">
            <span className="navbar__dot" />
            <span>{data.region}</span>
          </div>
          <span>{data.mode.toUpperCase()}</span>
          <span>{clock}</span>
        </div>
      </nav>

      {/* ── Page Content ─────────────────────────────── */}
      <main className="page" key={activePage}>
        <div className="page-header">
          <p className="page-header__eyebrow">{currentPage.eyebrow}</p>
          <h1 className="page-header__title">{currentPage.title}</h1>
          <p className="page-header__desc">{currentPage.desc}</p>
        </div>
        {pageContent}
      </main>
    </>
  );
}

export default App;
