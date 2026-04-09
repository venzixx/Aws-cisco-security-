# Collector Operations

## Current collector

- Instance name: `cisco-monitoring-collector`
- Instance id: `i-0196594d0ab6ada82`
- Public IP: `13.233.230.28`
- Private IP: `172.31.39.53`
- Security group: `sg-084f47a96419018c2`
- Syslog ports: TCP/UDP `514`
- Current allowed source: `103.92.46.90/32`

## Management

The instance is intended to be managed with AWS Systems Manager Session Manager, not SSH.

## What is running on it

- `rsyslog` for remote syslog collection
- `amazon-cloudwatch-agent` to ship `/var/log/cisco/ingest.log` to CloudWatch Logs
- a small archive script that uploads collector snapshots to S3 every 15 minutes

## Test example

You can point a Cisco device or laptop syslog sender to:

- host: `13.233.230.28`
- port: `514`
- protocol: `UDP` or `TCP`

## Next hardening step

Replace the temporary public-IP syslog path with Cisco-to-AWS Site-to-Site VPN and then remove the public syslog ingress rule.
