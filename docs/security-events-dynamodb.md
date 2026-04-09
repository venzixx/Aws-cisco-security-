# Structured Security Events

The project now stores structured simulator/security events in DynamoDB.

## Table

- table name: `cisco-security-events`
- region: `ap-south-1`
- billing mode: `PAY_PER_REQUEST`
- TTL attribute: `ttl`

## Recorded event types

- `failed_login_attempt`
- `failed_login_burst`
- `successful_login`
- `authenticated_access`
- `session_logout`
- `admin_probe`
- `config_backup_probe`
- `rate_limit_burst`
- `path_enumeration`

## Design note

The "DoS-like" scenario in the simulator is implemented as a safe rate-limit spike against your own protected app. It is intended to trigger logging and blocking behavior in a controlled lab setting, not to provide a real denial-of-service tool.
