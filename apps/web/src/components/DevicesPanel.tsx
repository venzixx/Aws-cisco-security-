import type { DeviceSummary } from "@monitoring/shared";

const deviceIcons: Record<DeviceSummary["type"], string> = {
  router: "🌐",
  firewall: "🛡️",
  switch: "🔀",
  collector: "📡",
};

const fixedPanelStyle = {
  height: "clamp(420px, 58vh, 560px)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  alignSelf: "start" as const,
};

export function DevicesPanel({ devices }: { devices: DeviceSummary[] }) {
  return (
    <section className="panel panel--fixed" style={fixedPanelStyle}>
      <div className="panel__header">
        <h2>Device Health</h2>
        <span>{devices.length} devices</span>
      </div>

      <div
        className="devices-grid devices-grid--scroll"
        style={{ minHeight: 0, overflowY: "auto" }}
      >
        {devices.map((device) => (
          <article key={device.id} className="device-card">
            <div className="device-card__title">
              <h3>{device.name}</h3>
              <span className={`status-dot status-dot--${device.health}`} />
            </div>
            <div className="device-card__type">
              <span className="device-card__type-icon">
                {deviceIcons[device.type] ?? "📦"}
              </span>
              {device.type}
            </div>
            <p>{device.location}</p>
            <small>
              Last seen {new Date(device.lastSeen).toLocaleTimeString()}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
