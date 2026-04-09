# Collector Bootstrap

This folder contains the bootstrap files for the EC2 syslog collector.

## What it does

- installs `rsyslog`
- listens for remote syslog on TCP and UDP `514`
- writes normalized log lines to `/var/log/cisco/ingest.log`
- ships the log file to CloudWatch Logs
- uploads snapshots of the file to S3 every 15 minutes
- is intended to be managed through AWS Systems Manager Session Manager instead of SSH

## Notes

- Current bootstrap targets `ap-south-1`
- Current archive bucket: `cisco-secure-monitoring-961457613870-ap-south-1`
- Current CloudWatch log group: `/cisco/secure-monitoring/logs`
- Current temporary syslog source lock: your laptop public IP `/32`

For production, replace direct internet syslog with Cisco-to-AWS Site-to-Site VPN and tighten the security group to private address ranges only.
