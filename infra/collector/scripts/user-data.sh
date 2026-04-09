#!/bin/bash
set -euxo pipefail

dnf update -y
dnf install -y rsyslog amazon-cloudwatch-agent logrotate

mkdir -p /var/log/cisco
touch /var/log/cisco/ingest.log
chmod 640 /var/log/cisco/ingest.log

cat >/etc/rsyslog.d/30-cisco-collector.conf <<'RSYSLOG'
module(load="imudp")
module(load="imtcp")

template(name="CollectorLine" type="string" string="%timereported:::date-rfc3339% %hostname% %msg%\n")

ruleset(name="remote") {
  action(type="omfile" file="/var/log/cisco/ingest.log" template="CollectorLine")
  stop
}

input(type="imudp" port="514" ruleset="remote")
input(type="imtcp" port="514" ruleset="remote")
RSYSLOG

cat >/etc/logrotate.d/cisco-collector <<'LOGROTATE'
/var/log/cisco/ingest.log {
  daily
  rotate 7
  missingok
  notifempty
  compress
  delaycompress
  copytruncate
}
LOGROTATE

cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'CWAGENT'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/cisco/ingest.log",
            "log_group_name": "/cisco/secure-monitoring/logs",
            "log_stream_name": "{instance_id}/collector",
            "retention_in_days": 30
          }
        ]
      }
    }
  }
}
CWAGENT

cat >/usr/local/bin/archive-cisco-logs.sh <<'ARCHIVE'
#!/bin/bash
set -euo pipefail
TOKEN=$(curl -sS -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")
INSTANCE_ID=$(curl -sS -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
aws s3 cp /var/log/cisco/ingest.log "s3://cisco-secure-monitoring-961457613870-ap-south-1/collector/${INSTANCE_ID}/ingest-latest.log"
aws s3 cp /var/log/cisco/ingest.log "s3://cisco-secure-monitoring-961457613870-ap-south-1/collector/${INSTANCE_ID}/snapshots/${TIMESTAMP}.log"
ARCHIVE

chmod +x /usr/local/bin/archive-cisco-logs.sh

cat >/etc/cron.d/cisco-archive <<'CRON'
*/15 * * * * root /usr/local/bin/archive-cisco-logs.sh >/var/log/cisco/archive.log 2>&1
CRON

systemctl enable --now rsyslog
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s
systemctl restart crond
