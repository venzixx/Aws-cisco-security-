# Cisco AWS Secure Monitoring Dashboard

This repository contains a local-first build of a secure Cisco-to-AWS monitoring system. The project is organized so we can develop the dashboard and API on a laptop first, then switch the data source from mock events to AWS-backed log ingestion.

## Repository layout

- `apps/api`: Express API for dashboard data, alerts, and future AWS integrations
- `apps/web`: React dashboard for logs, alerts, charts, and device visibility
- `apps/source`: Protected cloud-source app that emits security-relevant syslog to the collector
- `apps/simulator`: Controlled traffic simulator for generating benign suspicious activity against the source app
- `packages/shared`: Shared types used by both applications
- `docs`: Architecture and deployment notes

## Planned build phases

1. Scaffold the web app, API, and shared types
2. Implement dashboard views against a stable API contract
3. Replace mock data with CloudWatch Logs, S3, and alert adapters
4. Deploy the API and dashboard to EC2 in `ap-south-1`
5. Connect a Cisco log source or collector using secure transport

## Quick start

After installing dependencies:

```bash
npm install
npm run dev:api
npm run dev:web
npm run dev:source
npm run dev:simulator
```

The API runs on `http://127.0.0.1:4000` and the dashboard runs on `http://127.0.0.1:4173`.

Additional local apps:

- Protected cloud source: `http://127.0.0.1:4300`
- Traffic simulator: `http://127.0.0.1:4400`

Recommended run order:

1. `npm run dev:api`
2. `npm run dev:web`
3. `npm run dev:source`
4. `npm run dev:simulator`

The simulator is intentionally limited to safe, controlled traffic against your own local protected source app.
