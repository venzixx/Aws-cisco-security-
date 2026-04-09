import type { SecurityAlert } from "@monitoring/shared";

const severityLabel: Record<SecurityAlert["severity"], string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export function AlertsList({ alerts }: { alerts: SecurityAlert[] }) {
  return (
    <div className="alerts-workspace">
      {alerts.length === 0 ? (
        <section className="panel glass" style={{ padding: "40px", textAlign: "center" }}>
          <p className="empty-state">No active alerts match the current filter.</p>
        </section>
      ) : (
        alerts.map((alert) => (
          <article
            key={alert.id}
            className={`alert-card alert-card--${alert.severity}`}
          >
            <div className="alert-card__header">
              <span className="alert-card__id">{alert.id.toUpperCase()}</span>
              <span className="alert-card__time">
                {new Date(alert.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            <div className="alert-card__top">
              <h3>{alert.title}</h3>
            </div>

            <p className="alert-card__desc">{alert.description}</p>

            <div className="alert-card__meta">
              <span>Device: <strong>{alert.deviceName}</strong></span>
              <span>Rule-ID: <strong>{alert.ruleId}</strong></span>
              <span>Severity: <strong>{severityLabel[alert.severity]}</strong></span>
            </div>

            {alert.suggestions.length > 0 && (
              <div className="alert-card__actions">
                <span className="alert-card__action-title">Recommended Response</span>
                {alert.suggestions.map((suggestion, idx) => (
                  <div key={idx} className="alert-card__action-item">
                    <span><strong>{suggestion.title}:</strong> {suggestion.action}</span>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}

