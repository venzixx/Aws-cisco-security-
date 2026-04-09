import type { SecurityEvent } from "@monitoring/shared";

const fixedPanelStyle = {
  height: "clamp(420px, 58vh, 560px)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  alignSelf: "start" as const,
};

export function SimulationEventsPanel({ events }: { events: SecurityEvent[] }) {
  return (
    <section className="panel panel--fixed" style={fixedPanelStyle}>
      <div className="panel__header">
        <h2>Structured Access & Security Events</h2>
        <span>{events.length} stored in DynamoDB</span>
      </div>

      <div
        className="events-list events-list--scroll"
        style={{ minHeight: 0, overflowY: "auto" }}
      >
        {events.length === 0 ? (
          <p className="empty-state">
            No structured security events have been recorded yet.
          </p>
        ) : (
          events.map((event) => (
            <article
              key={event.id}
              className={`event-item event-item--${event.severity}`}
            >
              <div className="event-item__meta">
                <span className={`badge badge--${event.severity}`}>
                  {event.eventType.replaceAll("_", " ")}
                </span>
                <span className="ip-cell">{event.sourceIp}</span>
                <span>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <span className={`badge badge--${event.status === "blocked" ? "high" : "low"}`}>
                  {event.status}
                </span>
              </div>
              <h3>{event.summary}</h3>
              <p>{event.details}</p>
              <small>
                Actor <strong>{event.actor}</strong> on{" "}
                <code>{event.targetPath}</code>
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
