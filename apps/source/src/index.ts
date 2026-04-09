import { randomUUID } from "node:crypto";

import express from "express";
import type { SecurityEvent } from "@monitoring/shared";

import { sourceConfig } from "./config.js";
import { 
  readEc2File, 
  listEc2Files, 
  writeEc2File, 
  deleteEc2File,
  readProtectedEc2File 
} from "./lib/ec2File.js";
import { recordSecurityEvent } from "./lib/securityEvents.js";
import { emitSyslog } from "./lib/syslog.js";

const app = express();
const trafficWindow = new Map<string, number[]>();
const authFailureWindow = new Map<string, number[]>();
const eventCooldowns = new Map<string, number>();
const sessions = new Map<string, { username: string; createdAt: number }>();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function getClientIp(request: express.Request) {
  const forwarded = request.header("x-forwarded-for");
  const candidate = forwarded?.split(",")[0]?.trim() || request.ip || "127.0.0.1";
  return candidate.replace("::ffff:", "");
}

function parseCookies(request: express.Request) {
  const rawCookie = request.header("cookie");

  if (!rawCookie) {
    return new Map<string, string>();
  }

  return new Map(
    rawCookie.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}

function getSession(request: express.Request) {
  const sessionId = parseCookies(request).get("portal_session");

  if (!sessionId) {
    return null;
  }

  return sessions.get(sessionId) ?? null;
}

function requireSession(request: express.Request, response: express.Response) {
  const session = getSession(request);

  if (!session) {
    response.redirect("/");
    return null;
  }

  return session;
}

function recordTraffic(ip: string) {
  const now = Date.now();
  const existing = trafficWindow.get(ip) ?? [];
  const fresh = existing.filter((timestamp) => now - timestamp < 15_000);
  fresh.push(now);
  trafficWindow.set(ip, fresh);

  return fresh.length;
}

function recordAuthFailure(key: string) {
  const now = Date.now();
  const existing = authFailureWindow.get(key) ?? [];
  const fresh = existing.filter((timestamp) => now - timestamp < 120_000);
  fresh.push(now);
  authFailureWindow.set(key, fresh);

  return fresh.length;
}

function shouldCreateEvent(key: string, cooldownMs = 5_000) {
  const now = Date.now();
  const lastSeen = eventCooldowns.get(key) ?? 0;

  if (now - lastSeen < cooldownMs) {
    return false;
  }

  eventCooldowns.set(key, now);
  return true;
}

async function emitTrafficAlert(ip: string) {
  await emitSyslog(`%IOSXE-5-PLATFORM: Interface GigabitEthernet1 traffic rate crossed threshold due to burst traffic from ${ip}.`);
}

async function createSecurityEvent(event: {
  eventType: SecurityEvent["eventType"];
  severity: SecurityEvent["severity"];
  sourceIp: string;
  targetPath: string;
  status: SecurityEvent["status"];
  actor: string;
  summary: string;
  details: string;
}) {
  try {
    await recordSecurityEvent(event);
  } catch (error) {
    console.error("Failed to write security event to DynamoDB:", error);
  }
}

async function logSuccessfulLogin(username: string, ip: string) {
  await emitSyslog(`%ASA-6-113015: Group <WEB> User <${username}> IP <${ip}> Authentication accepted.`);
  await createSecurityEvent({
    eventType: "successful_login",
    severity: "low",
    sourceIp: ip,
    targetPath: "/login",
    status: "logged",
    actor: username,
    summary: "Successful portal login recorded.",
    details: `User ${username} authenticated successfully from ${ip}.`
  });
}

async function logFailedLoginAttempt(username: string, ip: string) {
  await emitSyslog(`%ASA-4-722051: Group <WEB> User <${username}> IP <${ip}> Authentication rejected.`);
  await createSecurityEvent({
    eventType: "failed_login_attempt",
    severity: "medium",
    sourceIp: ip,
    targetPath: "/login",
    status: "blocked",
    actor: username,
    summary: "Failed portal login recorded.",
    details: `User ${username} failed authentication from ${ip}.`
  });
}

async function logAuthenticatedAccess(request: express.Request, actor: string, targetPath: string, summary: string, details: string) {
  const ip = getClientIp(request);

  await emitSyslog(`%IOSXE-6-SEC_AUDIT: User <${actor}> IP <${ip}> Accessed protected resource <${targetPath}>.`);
  await createSecurityEvent({
    eventType: "authenticated_access",
    severity: "low",
    sourceIp: ip,
    targetPath,
    status: "logged",
    actor,
    summary,
    details
  });
}

async function logLogout(request: express.Request, actor: string) {
  const ip = getClientIp(request);

  await emitSyslog(`%ASA-6-113019: Group <WEB> User <${actor}> IP <${ip}> Session disconnected normally.`);
  await createSecurityEvent({
    eventType: "session_logout",
    severity: "low",
    sourceIp: ip,
    targetPath: "/logout",
    status: "logged",
    actor,
    summary: "Portal session ended.",
    details: `User ${actor} signed out from ${ip}.`
  });
}

/* ═══════════════════════════════════════════════════════════
   Premium HTML Templates
   ═══════════════════════════════════════════════════════════ */

function pageShell(title: string, body: string, activeTab: string = "") {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content="Secure AWS Access Portal — Cisco-protected cloud resource gateway." />
      <meta name="theme-color" content="#000000" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <title>${title}</title>
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
          --critical: #ff4d6d;
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

        .nav-links { display: flex; gap: 8px; }

        .nav-link {
          padding: 8px 16px;
          border-radius: 8px;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 200ms ease;
        }

        .nav-link:hover { color: var(--text); background: var(--glass); }
        .nav-link--active { color: var(--text); background: var(--glass); border: 1px solid var(--glass-border); }

        /* ── Layout ── */
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 32px;
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
          padding: 32px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: var(--shadow);
        }

        .hero { margin-bottom: 32px; }
        .hero h1 { font-size: 2.2rem; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.03em; }
        .hero p { color: var(--text-secondary); font-size: 1.05rem; max-width: 600px; }

        /* ── KV Pairs ── */
        .kv { display: grid; gap: 20px; }
        .kv > div { 
          padding: 16px; 
          background: rgba(255,255,255,0.02); 
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.04);
        }
        .kv strong { display: block; color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
        .kv span { color: var(--text); font-size: 1rem; font-weight: 500; }
        .kv code { font-family: 'JetBrains Mono', monospace; color: var(--accent); background: rgba(0, 188, 235, 0.08); padding: 2px 6px; border-radius: 4px; }

        /* ── Buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 48px;
          padding: 0 24px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 200ms ease;
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn:hover { background: rgba(255, 255, 255, 0.12); border-color: rgba(255, 255, 255, 0.22); transform: translateY(-2px); }
        .btn-primary { background: var(--accent); color: #000; border: none; }
        .btn-primary:hover { background: #00d1ff; }

        /* ── Forms ── */
        .form-group { margin-bottom: 20px; }
        .form-label { display: block; color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px; }
        .form-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px 16px;
          color: #fff;
          font-size: 0.95rem;
          transition: all 200ms ease;
        }
        .form-input:focus { outline: none; border-color: var(--accent); background: rgba(255,255,255,0.06); }

        pre {
          background: #000;
          padding: 24px;
          border-radius: 16px;
          border: 1px solid var(--glass-border);
          color: #34d399;
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.9rem;
          overflow-x: auto;
          margin-top: 12px;
          line-height: 1.6;
        }

        .alert-box {
          background: rgba(255, 77, 109, 0.08);
          border: 1px solid rgba(255, 77, 109, 0.2);
          color: var(--critical);
          padding: 14px 18px;
          border-radius: 10px;
          font-size: 0.9rem;
          margin-bottom: 24px;
        }

        .pill { 
          display: inline-block; 
          background: var(--accent-soft); 
          color: var(--accent); 
          padding: 4px 12px; 
          border-radius: 20px; 
          font-size: 0.75rem; 
          font-weight: 700; 
          text-transform: uppercase; 
          letter-spacing: 0.05em; 
          margin-bottom: 12px; 
        }

        .meta { display: flex; gap: 16px; margin-top: 24px; }
        .meta span { color: var(--text-muted); font-size: 0.85rem; }

        .grid { display: grid; grid-template-columns: 1fr 320px; gap: 24px; }
        .stack { display: flex; flex-direction: column; gap: 24px; }
      </style>
    </head>
    <body>
      <nav class="top-nav">
        <a href="/" class="nav-brand">
          <div class="nav-logo">
            <svg viewBox="0 0 24 24"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M12 22V12"/><path d="M3 7l9 5 9-5"/></svg>
          </div>
          <span>Secure Cloud Source</span>
        </a>
        <div class="nav-links">
          <a href="/resource/vpc" class="nav-link ${activeTab === "VPC Segment" ? "nav-link--active" : ""}">VPC</a>
          <a href="/resource/ec2" class="nav-link ${activeTab === "EC2 Workload" ? "nav-link--active" : ""}">EC2</a>
          <a href="/admin" class="nav-link ${activeTab === "Admin Console" ? "nav-link--active" : ""}">Admin</a>
          <a href="/config-backup" class="nav-link ${activeTab === "Config Backup" ? "nav-link--active" : ""}">Backup</a>
          <a href="/logout" class="nav-link" style="color: var(--critical)">Logout</a>
        </div>
      </nav>
      <main class="container">
        ${body}
      </main>
    </body>
  </html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

const shieldSvg = `<svg viewBox="0 0 24 24"><path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/><path d="M12 22V12"/><path d="M3 7l9 5 9-5"/></svg>`;

function renderLoginPage(errorMessage?: string) {
  const body = `
    <div style="max-width: 440px; margin: 80px auto 0;">
      <div class="glass-panel">
        <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 8px;">Access Portal</h1>
        <p style="margin-bottom: 32px; color: var(--text-secondary);">Authenticate to access protected cloud resources.</p>
        
        ${errorMessage ? `<div class="alert-box">${errorMessage}</div>` : ""}

        <form action="/login" method="POST" style="display: flex; flex-direction: column; gap: 20px;">
          <div class="form-group">
            <label class="form-label">Identifier</label>
            <input type="text" name="username" class="form-input" placeholder="Enter username" required autofocus />
          </div>
          <div class="form-group">
            <label class="form-label">Security Key</label>
            <input type="password" name="password" class="form-input" placeholder="••••••••" required />
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 10px;">Authenticate Securely</button>
        </form>
      </div>
      <p style="text-align: center; margin-top: 32px; color: var(--text-muted); font-size: 0.8rem;">
        Protected by Cisco Secure Cloud Access
      </p>
    </div>
  `;
  return pageShell("Login | Secure Cloud Source", body);
}

function renderPortal(username: string) {
  return pageShell(
    "Portal | Secure Cloud Source",
    `<header class="hero">
      <div class="pill">Authenticated Session</div>
      <h1>Protected Resource Hub</h1>
      <p>This console provides secure access to AWS-hosted environments. All access is audited via the Cisco Monitoring Pipeline.</p>
      <div class="meta">
        <span>Active User: <strong>${escapeHtml(username)}</strong></span>
        <span>Environment: <strong>Production-VPC</strong></span>
      </div>
    </header>

    <div class="grid">
      <div class="stack">
        <div class="glass-panel">
          <h2 style="margin-bottom: 24px; font-size: 1.1rem;">VPC Infrastructure</h2>
          <div class="kv">
            <div><strong>VPC Identifier</strong><span><code>${sourceConfig.vpcId}</code></span></div>
            <div><strong>Region</strong><span><code>${sourceConfig.awsRegion}</code></span></div>
            <div><strong>Access Policy</strong><span>Restricted (L3/L4 monitoring active)</span></div>
          </div>
        </div>

        <div class="glass-panel">
          <h2 style="margin-bottom: 24px; font-size: 1.1rem;">Active Workloads</h2>
          <div class="kv">
            <div><strong>Primary Instance</strong><span><code>${sourceConfig.collectorInstanceId}</code></span></div>
            <div><strong>Internal IP</strong><span><code>${sourceConfig.collectorPrivateIp}</code></span></div>
          </div>
        </div>
      </div>

      <div class="stack">
        <div class="glass-panel">
          <h2 style="margin-bottom: 20px; font-size: 1rem; color: var(--text-muted); text-transform: uppercase;">Quick Actions</h2>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <a href="/resource/vpc" class="btn">View VPC Boundary</a>
            <a href="/resource/ec2" class="btn">Open EC2 Workload</a>
            <a href="/admin" class="btn">Admin Console</a>
            <a href="/config-backup" class="btn">Config Backup</a>
          </div>
        </div>
        <div class="glass-panel" style="background: var(--accent-soft); border-color: rgba(0, 188, 235, 0.2);">
          <h2 style="margin-bottom: 8px; font-size: 0.9rem; color: var(--accent);">System Health</h2>
          <p style="font-size: 0.85rem; color: var(--text-secondary);">Traffic monitoring and syslog collection are currently operational.</p>
        </div>
      </div>
    </div>`,
    ""
  );
}

function renderResourcePage(title: string, description: string, details: string, activeTab: string) {
  return pageShell(
    `${title} | Secure Cloud Source`,
    `
    <header class="hero">
      <div class="pill">Protected Resource</div>
      <h1>${title}</h1>
      <p>${description}</p>
    </header>
    
    <div class="glass-panel">
      <h2 style="margin-bottom: 24px; font-size: 1rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em;">Resource Configuration</h2>
      <div class="kv">
        ${details}
      </div>
    </div>
    `,
    activeTab
  );
}

function renderFileExplorer(username: string, directory: string, files: any[]) {
  const fileItems = files.map(file => `
    <div class="glass-panel" style="padding: 20px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--accent);">
          ${file.isDirectory 
            ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>`
            : `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>`
          }
        </div>
        <div>
          <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(file.name)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${file.isDirectory ? 'Directory' : 'Protected File'}</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        ${!file.isDirectory ? `
          <a href="/resource/ec2/view?path=${encodeURIComponent(directory + '/' + file.name)}" class="btn" style="min-height: 36px; padding: 0 16px; font-size: 0.8rem;">View</a>
          <a href="/resource/ec2/edit?path=${encodeURIComponent(directory + '/' + file.name)}" class="btn" style="min-height: 36px; padding: 0 16px; font-size: 0.8rem;">Edit</a>
          <form action="/resource/ec2/delete" method="POST" style="display: inline; max-width: none;" onsubmit="return confirm('Secure Delete: Are you sure you want to remove this file permanently?')">
            <input type="hidden" name="path" value="${escapeHtml(directory + '/' + file.name)}">
            <button type="submit" class="btn" style="min-height: 36px; padding: 0 16px; font-size: 0.8rem; color: var(--critical); border-color: rgba(255, 77, 109, 0.2);">Delete</button>
          </form>
        ` : ''}
      </div>
    </div>
  `).join('');

  return renderResourcePage(
    "EC2 Secure File Explorer",
    `Managing files on <code>${sourceConfig.collectorInstanceId}</code> via Cisco Secure Access.`,
    `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <div class="breadcrumb">
        <a href="/resource/ec2">EC2 Dashboard</a>
        <span>/</span>
        <span>${escapeHtml(directory)}</span>
      </div>
      <a href="/resource/ec2/create" class="btn btn-primary" style="min-height: 40px;">+ New Secure File</a>
    </div>
    <div class="stack">
      ${fileItems || '<div class="glass-panel" style="text-align: center; color: var(--text-muted);">No protected files found in this directory.</div>'}
    </div>
    `,
    "EC2 Workload"
  );
}

function renderFileEditor(title: string, path: string, content: string = "") {
  return renderResourcePage(
    title,
    `Editing <code>${escapeHtml(path)}</code> on the protected workload instance.`,
    `
    <form action="/resource/ec2/save" method="POST" style="max-width: none;">
      <input type="hidden" name="path" value="${escapeHtml(path)}">
      <div class="form-group">
        <label class="form-label">Secure Content Agent</label>
        <textarea name="content" class="form-input" style="min-height: 400px; font-family: 'JetBrains Mono', monospace; line-height: 1.6; resize: vertical;">${escapeHtml(content)}</textarea>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 12px;">
        <button type="submit" class="btn btn-primary">Save Changes</button>
        <a href="/resource/ec2/files" class="btn">Cancel</a>
      </div>
    </form>
    `,
    "EC2 Workload"
  );
}

function renderFileCreator(directory: string) {
  return renderResourcePage(
    "Create Secure File",
    "Provision a new protected file on the EC2 workload.",
    `
    <form action="/resource/ec2/save" method="POST" style="max-width: 500px;">
      <div class="form-group">
        <label class="form-label">File Name</label>
        <input type="text" name="filename" class="form-input" placeholder="e.g. security-audit-log.txt" required>
        <input type="hidden" name="directory" value="${escapeHtml(directory)}">
      </div>
      <div class="form-group">
        <label class="form-label">Initial Content</label>
        <textarea name="content" class="form-input" style="min-height: 200px; font-family: 'JetBrains Mono', monospace;"></textarea>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 12px;">
        <button type="submit" class="btn btn-primary">Create File</button>
        <a href="/resource/ec2/files" class="btn">Cancel</a>
      </div>
    </form>
    `,
    "EC2 Workload"
  );
}

/* ═══════════════════════════════════════════════════════════
   Middleware (all logic preserved exactly)
   ═══════════════════════════════════════════════════════════ */

app.use(async (request, _response, next) => {
  try {
    const ip = getClientIp(request);
    const count = recordTraffic(ip);

    if (count === 15 && shouldCreateEvent(`rate:${ip}`, 10_000)) {
      await emitTrafficAlert(ip);
      await createSecurityEvent({
        eventType: "rate_limit_burst",
        severity: "high",
        sourceIp: ip,
        targetPath: request.path,
        status: "simulated",
        actor: "traffic-simulator",
        summary: "Rate-limit burst detected against the protected application.",
        details: `A controlled request burst from ${ip} crossed the safe monitoring threshold on ${request.path}.`
      });
    }

    if (count >= 22 && request.path !== "/health") {
      _response.status(429).send("Rate limit triggered. Request blocked.");
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
});

app.use(async (request, response, next) => {
  const suspiciousPaths = new Set(["/.env", "/wp-admin", "/phpmyadmin", "/server-status", "/actuator"]);

  if (!suspiciousPaths.has(request.path)) {
    next();
    return;
  }

  try {
    const ip = getClientIp(request);

    if (shouldCreateEvent(`path:${ip}:${request.path}`)) {
      await emitSyslog(
        `%ASA-4-106023: Deny tcp src outside:${ip}/41234 dst inside:${sourceConfig.collectorPrivateIp}/443 by access-group "${sourceConfig.securityGroupName}" suspicious path probe ${request.path}`
      );
      await createSecurityEvent({
        eventType: "path_enumeration",
        severity: "medium",
        sourceIp: ip,
        targetPath: request.path,
        status: "blocked",
        actor: "enumeration-probe",
        summary: "Sensitive path enumeration attempt detected.",
        details: `A probe for ${request.path} was blocked before reaching the protected workload.`
      });
    }

    response.status(404).send("Not found.");
  } catch (error) {
    next(error);
  }
});

/* ═══════════════════════════════════════════════════════════
   Routes (all logic preserved exactly)
   ═══════════════════════════════════════════════════════════ */

app.get("/", async (request, response, next) => {
  try {
    const session = getSession(request);

    if (!session) {
      response.send(renderLoginPage());
      return;
    }

    await logAuthenticatedAccess(
      request,
      session.username,
      "/",
      "Authenticated portal access recorded.",
      `User ${session.username} opened the main secured portal view.`
    );

    response.send(renderPortal(session.username));
  } catch (error) {
    next(error);
  }
});

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "protected-cloud-source",
    appName: sourceConfig.appName,
    collectorHost: sourceConfig.collectorHost
  });
});

app.post("/login", async (request, response, next) => {
  try {
    const ip = getClientIp(request);
    const username = String(request.body.username ?? "unknown");
    const password = String(request.body.password ?? "");

    if (username === sourceConfig.portalUsername && password === sourceConfig.portalPassword) {
      const sessionId = randomUUID();
      sessions.set(sessionId, {
        username,
        createdAt: Date.now()
      });
      response.setHeader("Set-Cookie", `portal_session=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax`);
      await logSuccessfulLogin(username, ip);
      response.redirect("/");
      return;
    }

    await logFailedLoginAttempt(username, ip);
    const failureCount = recordAuthFailure(`${ip}:${username}`);

    if (failureCount >= 3 && shouldCreateEvent(`auth:${ip}:${username}`)) {
      await createSecurityEvent({
        eventType: "failed_login_burst",
        severity: "high",
        sourceIp: ip,
        targetPath: "/login",
        status: "blocked",
        actor: username,
        summary: "Repeated login failures detected.",
        details: `${failureCount} failed login attempts were recorded for ${username} from ${ip}.`
      });
    }

    response.status(401).send(renderLoginPage("Authentication failed. This event has been logged to the monitoring pipeline."));
  } catch (error) {
    next(error);
  }
});

app.get("/logout", async (request, response, next) => {
  try {
    const sessionId = parseCookies(request).get("portal_session");
    const session = sessionId ? sessions.get(sessionId) ?? null : null;

    if (sessionId) {
      sessions.delete(sessionId);
    }

    if (session) {
      await logLogout(request, session.username);
    }

    response.setHeader("Set-Cookie", "portal_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
    response.redirect("/");
  } catch (error) {
    next(error);
  }
});

app.get("/api/public", async (request, response, next) => {
  const session = requireSession(request, response);

  if (!session) {
    return;
  }

  try {
    await logAuthenticatedAccess(
      request,
      session.username,
      "/api/public",
      "Authenticated API access recorded.",
      `User ${session.username} requested the protected service API feed.`
    );

    response.json({
      message: "Protected application service feed is healthy.",
      service: sourceConfig.protectedServiceLabel,
      generatedAt: new Date().toISOString(),
      requestedBy: session.username
    });
  } catch (error) {
    next(error);
  }
});

app.get("/resource/vpc", async (request, response, next) => {
  const session = requireSession(request, response);

  if (!session) {
    return;
  }

  try {
    await logAuthenticatedAccess(
      request,
      session.username,
      "/resource/vpc",
      "Authenticated VPC view access recorded.",
      `User ${session.username} opened the VPC security boundary view.`
    );

    response.send(
      renderResourcePage(
        "VPC Security Boundary",
        "This view exposes the protected network boundary that holds the secured workload and its monitoring collector.",
        `<div class="kv">
          <div><strong>VPC ID</strong><span><code>${sourceConfig.vpcId}</code></span></div>
          <div><strong>Region</strong><span><code>${sourceConfig.awsRegion}</code></span></div>
          <div><strong>Ingress Posture</strong><span>Restricted access, monitored syslog path, dashboard visibility enabled</span></div>
          <div><strong>Viewer</strong><span>${escapeHtml(session.username)}</span></div>
        </div>`,
        "VPC Segment"
      )
    );
  } catch (error) {
    next(error);
  }
});

app.get("/resource/ec2", async (request, response, next) => {
  const session = requireSession(request, response);

  if (!session) {
    return;
  }

  try {
    const fileContents = await readProtectedEc2File();
    await logAuthenticatedAccess(
      request,
      session.username,
      "/resource/ec2",
      "Authenticated EC2 workload access recorded.",
      `User ${session.username} opened the EC2 workload view.`
    );

    response.send(
      renderResourcePage(
        "EC2 Protected Workload",
        "This view represents the EC2-resident workload and collector path that the dashboard is monitoring.",
        `<div class="grid">
          <div class="stack">
            <div class="kv">
              <div><strong>Instance ID</strong><span><code>${sourceConfig.collectorInstanceId}</code></span></div>
              <div><strong>Private IP</strong><span><code>${sourceConfig.collectorPrivateIp}</code></span></div>
              <div><strong>Attached Monitor</strong><span>CloudWatch log collection active</span></div>
              <div><strong>Protected File Path</strong><span><code>${sourceConfig.protectedFilePath}</code></span></div>
            </div>
            
            <div class="glass-panel">
              <h3 style="font-size: 1rem; margin-bottom: 12px;">Quick Actions</h3>
              <div style="display: flex; gap: 12px;">
                <a href="/resource/ec2/files" class="btn btn-primary">Open File Explorer</a>
                <a href="/resource/ec2/view?path=${encodeURIComponent(sourceConfig.protectedFilePath)}" class="btn">View Primary Note</a>
              </div>
            </div>
          </div>
          
          <div class="stack">
            <div class="glass-panel" style="padding: 24px;">
              <h3 style="font-size: 0.9rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px;">Node Status</h3>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: #34d399; box-shadow: 0 0 10px #34d399;"></div>
                <span style="font-weight: 600;">Operational</span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                This node is actively sending syslog data to the Cisco collector at <code>${sourceConfig.collectorHost}</code>.
              </p>
            </div>
          </div>
        </div>`,
        "EC2 Workload"
      )
    );
  } catch (error) {
    next(error);
  }
});

app.get("/resource/ec2/files", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  try {
    const directory = "/opt/protected-source";
    const files = await listEc2Files(directory);

    await logAuthenticatedAccess(
      request,
      session.username,
      "/resource/ec2/files",
      "Authenticated File Explorer access.",
      `User ${session.username} listed files in ${directory}.`
    );

    response.send(renderFileExplorer(session.username, directory, files));
  } catch (error) {
    next(error);
  }
});

app.get("/resource/ec2/view", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  const filePath = request.query.path as string;
  if (!filePath) return response.redirect("/resource/ec2/files");

  try {
    const content = await readEc2File(filePath);

    await logAuthenticatedAccess(
      request,
      session.username,
      "/resource/ec2/view",
      "Authenticated file read activity.",
      `User ${session.username} read file content: ${filePath}`
    );

    response.send(
      renderResourcePage(
        "File Content Viewer",
        `Viewing <code>${escapeHtml(filePath)}</code>`,
        `
        <div class="breadcrumb">
          <a href="/resource/ec2/files">File Explorer</a>
          <span>/</span>
          <span>${escapeHtml(filePath.split('/').pop() || '')}</span>
        </div>
        <pre>${escapeHtml(content || "File is empty or could not be read.")}</pre>
        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <a href="/resource/ec2/edit?path=${encodeURIComponent(filePath)}" class="btn btn-primary">Edit File</a>
          <a href="/resource/ec2/files" class="btn">Back to Explorer</a>
        </div>
        `,
        "EC2 Workload"
      )
    );
  } catch (error) {
    next(error);
  }
});

app.get("/resource/ec2/edit", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  const filePath = request.query.path as string;
  if (!filePath) return response.redirect("/resource/ec2/files");

  try {
    const content = await readEc2File(filePath);
    response.send(renderFileEditor("Edit Secure File", filePath, content || ""));
  } catch (error) {
    next(error);
  }
});

app.get("/resource/ec2/create", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  response.send(renderFileCreator("/opt/protected-source"));
});

app.post("/resource/ec2/save", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  const { path, directory, filename, content } = request.body;
  const filePath = path || `${directory}/${filename}`;

  try {
    await writeEc2File(filePath, content || "");

    await emitSyslog(`%IOSXE-5-CONFIG_I: Configured from console by ${session.username} on vty0. Modified file ${filePath}`);
    await createSecurityEvent({
      eventType: "filesystem_control",
      severity: "medium",
      sourceIp: getClientIp(request),
      targetPath: filePath,
      status: "logged",
      actor: session.username,
      summary: "File system modification recorded.",
      details: `User ${session.username} created/updated file: ${filePath}`
    });

    response.redirect("/resource/ec2/files");
  } catch (error) {
    next(error);
  }
});

app.post("/resource/ec2/delete", async (request, response, next) => {
  const session = requireSession(request, response);
  if (!session) return;

  const { path } = request.body;

  try {
    await deleteEc2File(path);

    await emitSyslog(`%IOSXE-3-FILESYSTEM_ERR: File ${path} deleted by user ${session.username}.`);
    await createSecurityEvent({
      eventType: "filesystem_control",
      severity: "high",
      sourceIp: getClientIp(request),
      targetPath: path,
      status: "logged",
      actor: session.username,
      summary: "File deletion event recorded.",
      details: `User ${session.username} deleted file: ${path}`
    });

    response.redirect("/resource/ec2/files");
  } catch (error) {
    next(error);
  }
});

app.get("/admin", async (request, response, next) => {
  try {
    const session = getSession(request);

    if (!session) {
      const ip = getClientIp(request);
      await emitSyslog(
        `%ASA-4-106023: Deny tcp src outside:${ip}/41234 dst inside:${sourceConfig.collectorPrivateIp}/443 by access-group "${sourceConfig.securityGroupName}"`
      );
      await createSecurityEvent({
        eventType: "admin_probe",
        severity: "critical",
        sourceIp: ip,
        targetPath: "/admin",
        status: "blocked",
        actor: "unauthenticated-request",
        summary: "Blocked attempt to open the admin console.",
        details: `An unauthenticated request from ${ip} was denied at the admin console boundary.`
      });
      response.status(403).send("Admin console access denied.");
      return;
    }

    await logAuthenticatedAccess(
      request,
      session.username,
      "/admin",
      "Authenticated admin-console view recorded.",
      `User ${session.username} opened the guarded admin console view.`
    );

    response.send(
      renderResourcePage(
        "Admin Console",
        "Administrative access is gated even after login. This page represents a guarded operator view for the protected cloud workload.",
        `<div class="kv">
          <div><strong>Signed in as</strong><span>${escapeHtml(session.username)}</span></div>
          <div><strong>Mode</strong><span>Read-only viewer access</span></div>
          <div><strong>Security Group</strong><span><code>${sourceConfig.securityGroupName}</code></span></div>
        </div>`,
        "Admin Console"
      )
    );
  } catch (error) {
    next(error);
  }
});

app.get("/config-backup", async (request, response, next) => {
  try {
    const session = getSession(request);

    if (!session) {
      const ip = getClientIp(request);
      await emitSyslog(
        `%ASA-4-113019: Group = web-admin, Username = backup, IP = ${ip}, Session disconnected. Repeated authentication failures.`
      );
      await createSecurityEvent({
        eventType: "config_backup_probe",
        severity: "high",
        sourceIp: ip,
        targetPath: "/config-backup",
        status: "blocked",
        actor: "unauthenticated-request",
        summary: "Blocked attempt to access the configuration backup view.",
        details: `An unauthenticated request from ${ip} attempted to access the protected configuration backup page.`
      });
      response.status(403).send("Backup export denied.");
      return;
    }

    await logAuthenticatedAccess(
      request,
      session.username,
      "/config-backup",
      "Authenticated config-backup view recorded.",
      `User ${session.username} opened the protected configuration snapshot view.`
    );

    response.send(
      renderResourcePage(
        "Config Backup Snapshot",
        "This is a read-only protected snapshot view that stands in for secured configuration access.",
        `<div class="kv">
          <div><strong>Snapshot Owner</strong><span>${sourceConfig.protectedServiceLabel}</span></div>
          <div><strong>Visibility</strong><span>Authenticated viewer only</span></div>
          <div><strong>Cloud Region</strong><span><code>${sourceConfig.awsRegion}</code></span></div>
        </div>`,
        "Config Backup"
      )
    );
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected source server error";
  response.status(500).json({ message });
});

app.listen(sourceConfig.port, () => {
  console.log(`protected-cloud-source listening on http://127.0.0.1:${sourceConfig.port}`);
});
