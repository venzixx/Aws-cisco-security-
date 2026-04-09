import express from "express";

import { simulatorConfig } from "./config.js";
import { runAdminProbe, runFailedLoginBurst, runPathEnumeration, runTrafficSpike } from "./lib/scenarios.js";

const app = express();

app.use(express.urlencoded({ extended: false }));

const scenarios = [
  {
    id: "failed-logins",
    icon: "🔐",
    title: "Failed Logins",
    description: "Generates repeated bad sign-in attempts from one source IP to trigger authentication failure alerts.",
    severity: "high",
    path: "/simulate/failed-logins"
  },
  {
    id: "admin-probe",
    icon: "🛡️",
    title: "Admin Probe",
    description: "Requests protected admin and backup endpoints without authentication to trigger deny events.",
    severity: "critical",
    path: "/simulate/admin-probe"
  },
  {
    id: "traffic-spike",
    icon: "⚡",
    title: "Rate-Limit Spike",
    description: "Sends a controlled burst of requests to trigger flood detection and safe request blocking.",
    severity: "medium",
    path: "/simulate/traffic-spike"
  },
  {
    id: "path-enumeration",
    icon: "🔍",
    title: "Path Enumeration",
    description: "Requests common sensitive paths like /.env and /wp-admin to trigger protected-route probe events.",
    severity: "medium",
    path: "/simulate/path-enumeration"
  }
];

function renderPage(resultHtml?: string) {
  const severityColors: Record<string, string> = {
    critical: "#ff4d6d",
    high: "#ff9e00",
    medium: "#00bceb",
    low: "#34d399"
  };

  const scenarioCards = scenarios.map((s) => {
    const color = severityColors[s.severity] ?? "#ff9e00";
    return `
      <form class="glass-panel scenario-card" method="post" action="${s.path}">
        <div class="scenario-icon" style="background: ${color}15; color: ${color};">${s.icon}</div>
        <div class="scenario-content">
          <div class="scenario-header">
            <h3>${s.title}</h3>
            <span class="sev-badge" style="border-color: ${color}40; color: ${color}; background: ${color}08;">
              ${s.severity}
            </span>
          </div>
          <p class="scenario-desc">${s.description}</p>
          <button type="submit" class="btn btn-run">Run Simulation</button>
        </div>
      </form>`;
  }).join("\n");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Controlled traffic simulator for the Cisco AWS Secure Monitoring project." />
      <meta name="theme-color" content="#000000" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <title>Traffic Simulator | Cisco AWS</title>
      <style>
        *, *::before, *::after { box-sizing: border-box; margin: 0; }

        :root {
          --bg: #000000;
          --glass: rgba(255, 255, 255, 0.04);
          --glass-hover: rgba(255, 255, 255, 0.07);
          --glass-border: rgba(255, 255, 255, 0.08);
          --text: #ffffff;
          --text-secondary: #a0a0a0;
          --text-muted: #666666;
          --accent: #00bceb;
          --accent-soft: rgba(0, 188, 235, 0.10);
          --radius: 16px;
          --radius-lg: 20px;
          --shadow: 0 8px 32px rgba(0, 0, 0, 0.60);
        }

        body {
          font-family: 'Inter', -apple-system, sans-serif;
          background: var(--bg);
          color: var(--text);
          margin: 0;
          line-height: 1.5;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }

        /* ── Navigation ── */
        .top-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          height: 72px;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--glass-border);
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .nav-brand {
          display: flex;
          align-items: center;
          gap: 12px;
          text-decoration: none;
          color: var(--text);
        }

        .nav-logo {
          width: 32px;
          height: 32px;
          background: var(--accent);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(0, 188, 235, 0.3);
        }

        .nav-logo svg { width: 18px; height: 18px; stroke: #fff; fill: none; stroke-width: 2.5; }
        .nav-brand span { font-weight: 800; font-size: 1.1rem; letter-spacing: -0.02em; }

        .nav-links { display: flex; gap: 12px; }
        .nav-link {
          padding: 8px 16px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 200ms ease;
          border: 1px solid transparent;
        }
        .nav-link:hover { color: var(--text); background: var(--glass); }
        .nav-link--active { color: var(--text); background: var(--glass); border-color: var(--glass-border); }

        /* ── Layout ── */
        .container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 48px 32px;
          animation: fadeIn 600ms ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .glass-panel {
          background: var(--glass);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: var(--shadow);
        }

        .hero { margin-bottom: 40px; }
        .hero h1 { font-size: 2.4rem; font-weight: 900; margin-bottom: 12px; letter-spacing: -0.03em; }
        .hero p { color: var(--text-secondary); font-size: 1.1rem; max-width: 720px; line-height: 1.6; }

        .target-box {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--accent-soft);
          border: 1px solid rgba(0, 188, 235, 0.2);
          padding: 8px 16px;
          border-radius: 12px;
          margin-top: 24px;
          font-size: 0.85rem;
          color: var(--accent);
          font-weight: 600;
        }

        .target-box code { font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; color: #fff; }

        /* ── Scenarios ── */
        .scenarios-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-bottom: 40px;
        }

        .scenario-card {
          display: flex;
          padding: 24px;
          gap: 20px;
          transition: all 240ms cubic-bezier(0.4, 0, 0.2, 1);
        }

        .scenario-card:hover {
          background: var(--glass-hover);
          border-color: rgba(255,255,255,0.15);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }

        .scenario-icon {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .scenario-content { flex: 1; display: flex; flex-direction: column; }
        
        .scenario-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .scenario-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--text); }
        
        .sev-badge {
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid;
          letter-spacing: 0.05em;
        }

        .scenario-desc { font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 20px; flex: 1; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 0 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 200ms ease;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #fff;
          text-decoration: none;
        }

        .btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateY(-1px); }
        
        .btn-run { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); }
        .btn-run:hover { background: var(--accent); color: #000; border: none; }

        /* ── Results ── */
        .result-panel {
          margin-top: 32px;
          padding: 32px;
          border-left: 4px solid var(--accent);
        }

        .result-panel h2 { font-size: 1.2rem; font-weight: 800; margin-bottom: 12px; color: var(--accent); }
        
        pre {
          background: #000;
          padding: 24px;
          border-radius: 14px;
          border: 1px solid var(--glass-border);
          color: #34d399;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          overflow-x: auto;
          line-height: 1.6;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(52, 211, 153, 0.1);
          color: #34d399;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 700;
          margin-bottom: 16px;
        }
      </style>
    </head>
    <body>
      <nav class="top-nav">
        <div class="nav-brand">
          <div class="nav-logo">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <span>Traffic Simulator</span>
        </div>
        <div class="nav-links">
          <a href="/" class="nav-link nav-link--active">Scenarios</a>
          <a href="http://localhost:4173" class="nav-link">Monitoring Dashboard</a>
          <a href="http://localhost:4300" class="nav-link">Secure Portal</a>
        </div>
      </nav>

      <main class="container">
        <header class="hero">
          <h1>Security Event Generator</h1>
          <p>Execute controlled traffic scenarios against the protected cloud infrastructure to validate alerting paths, rate-limits, and security group enforcement.</p>
          
          <div class="target-box">
            <span>Target Pipeline:</span>
            <code>Cisco Monitoring Collector → AWS DynDB</code>
          </div>
        </header>

        <div class="scenarios-grid">
          ${scenarioCards}
        </div>

        ${resultHtml ? `
          <div class="glass-panel result-panel">
            <div class="status-pill">● Simulation Executed</div>
            <h2>Execution Results</h2>
            ${resultHtml}
          </div>
        ` : ""}
      </main>
    </body>
  </html>`;
}

function renderResult(title: string, message: string) {
  return `
    <h3>Scenario Complete — ${title}</h3>
    <p>The simulation request was dispatched successfully. Results were transmitted via the syslog collector to the central processing engine.</p>
    <pre>Event Sequence:
${message}</pre>
    <a href="/" class="btn" style="margin-top: 24px;">Confirm & Close</a>
  `;
}

app.get("/", (_request, response) => {
  response.send(renderPage());
});

app.post("/simulate/failed-logins", async (_request, response, next) => {
  try {
    const result = await runFailedLoginBurst();
    response.send(renderPage(renderResult("Failed Logins", result)));
  } catch (error) {
    next(error);
  }
});

app.post("/simulate/admin-probe", async (_request, response, next) => {
  try {
    const result = await runAdminProbe();
    response.send(renderPage(renderResult("Admin Probe", result)));
  } catch (error) {
    next(error);
  }
});

app.post("/simulate/traffic-spike", async (_request, response, next) => {
  try {
    const result = await runTrafficSpike();
    response.send(renderPage(renderResult("Rate-Limit Spike", result)));
  } catch (error) {
    next(error);
  }
});

app.post("/simulate/path-enumeration", async (_request, response, next) => {
  try {
    const result = await runPathEnumeration();
    response.send(renderPage(renderResult("Path Enumeration", result)));
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected simulator server error";
  response.status(500).json({ message });
});

app.listen(simulatorConfig.port, () => {
  console.log(`traffic-simulator listening on http://127.0.0.1:${simulatorConfig.port}`);
});
