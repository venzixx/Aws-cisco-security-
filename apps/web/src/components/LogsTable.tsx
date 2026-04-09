import type { NetworkLog } from "@monitoring/shared";

const fixedPanelStyle = {
  height: "clamp(420px, 58vh, 560px)",
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  overflow: "hidden",
  alignSelf: "start" as const,
};

export function LogsTable({ logs }: { logs: NetworkLog[] }) {
  return (
    <section className="panel panel--fixed" style={fixedPanelStyle}>
      <div className="panel__header">
        <h2>Live Logs</h2>
        <span>{logs.length} recent events</span>
      </div>

      <div
        className="table-wrap table-wrap--scroll"
        style={{ minHeight: 0, overflow: "auto" }}
      >
        {logs.length === 0 ? (
          <p className="empty-state">No logs match the current filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Device</th>
                <th>Category</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td>{log.deviceName}</td>
                  <td>
                    <span className={`badge badge--${log.severity}`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="ip-cell">{log.sourceIp}</td>
                  <td className="ip-cell">{log.destinationIp}</td>
                  <td>{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
