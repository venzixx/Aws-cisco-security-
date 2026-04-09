# Real AWS Ingestion

## Current AWS resources

- Region: `ap-south-1`
- CloudWatch log group: `/cisco/secure-monitoring/logs`
- S3 archive bucket: `cisco-secure-monitoring-961457613870-ap-south-1`
- SNS alert topic: `arn:aws:sns:ap-south-1:961457613870:cisco-secure-monitoring-alerts`

## Current application mode

The API now runs in `aws` mode by default through `apps/api/.env`. The dashboard reads logs from CloudWatch Logs and computes alerts locally using the rule engine.

## Seed workflow

To push sample logs into AWS:

```bash
npm --workspace @monitoring/api run seed:aws
```

This writes the seed events to:

- CloudWatch Logs for dashboard queries
- S3 for archive retention

## Recommended production path

1. Cisco router or firewall sends syslog to an EC2 log collector
2. Connectivity between Cisco and AWS is secured with AWS Site-to-Site VPN
3. The collector forwards events to CloudWatch Logs
4. Raw log copies are archived to S3
5. The dashboard API reads CloudWatch Logs and displays alerts, logs, and charts

## Secure design notes

- Do not use the AWS root account for daily operations
- Prefer IAM roles for EC2 and limited IAM users for development
- Keep the S3 archive bucket private with Block Public Access enabled
- Prefer IKEv2 for AWS Site-to-Site VPN with Cisco devices
