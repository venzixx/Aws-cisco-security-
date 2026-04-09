# Architecture Notes

## Local-first phase

The first iteration runs on the laptop:

- React dashboard in `apps/web`
- Express API in `apps/api`
- Mock data shaped like Cisco firewall and router logs
- Shared type contract in `packages/shared`

This gives us a stable product shell for logs, charts, alerts, and device summaries.

## Real AWS phase

The next phase replaces the mock service with AWS-backed adapters:

1. Cisco device or virtual appliance emits syslog to a collector
2. Collector forwards logs to CloudWatch Logs
3. Raw logs are archived to S3
4. Rule-based alarms produce alert objects
5. API reads CloudWatch, S3, and alert state for the dashboard

## Security direction

- AWS region: `ap-south-1`
- Use IAM roles instead of hard-coded credentials
- Restrict dashboard and collector access with security groups
- Prefer TLS syslog or private VPN transport for Cisco-to-cloud connectivity
