import React, { useEffect, useMemo, useState } from "react";
import { getDiagnosticsHistory, subscribeDiagnostics } from "@/core/diagnostics/DiagnosticsBus";
import { getMemorySnapshot, getRecentReceipts } from "@/core/echo/EchoCore";
import type { DiagnosticsEvent } from "@/types/runtime";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export const BrainDiagnosticsPanel: React.FC = () => {
  const [events, setEvents] = useState<DiagnosticsEvent[]>(() => getDiagnosticsHistory(100));
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeDiagnostics((event) => {
      setEvents((prev) => [...prev.slice(-99), event]);
      setRefreshTick((tick) => tick + 1);
    });
    return unsubscribe;
  }, []);

  const memory = useMemo(() => getMemorySnapshot(), [refreshTick]);
  const receipts = useMemo(() => getRecentReceipts(12), [refreshTick]);

  const latestByPhase = useMemo(() => {
    const map = new Map<string, DiagnosticsEvent>();
    for (const event of events) {
      map.set(event.phase, event);
    }
    return Array.from(map.values()).sort((a, b) => a.phase.localeCompare(b.phase));
  }, [events]);

  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1.25fr 1fr", padding: 16, background: "#0b1020", color: "#e5eefc", borderRadius: 16 }}>
      <section style={{ background: "#121936", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Agent Lee Brain Diagnostics</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {latestByPhase.map((event) => (
            <div key={event.id} style={{ border: "1px solid #27315f", borderRadius: 10, padding: 10, background: "#0f1730" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{event.phase}</strong>
                <span>{event.status}</span>
              </div>
              <div style={{ opacity: 0.85, marginTop: 4 }}>{event.message}</div>
              <div style={{ opacity: 0.65, marginTop: 4, fontSize: 12 }}>{event.core} · {formatTime(event.timestamp)}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        <div style={{ background: "#121936", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Echo Memory</h3>
          <div>Total Entries: {memory.totalEntries}</div>
          <div>Total Clusters: {memory.totalClusters}</div>
          <div style={{ marginTop: 8 }}>
            {memory.clusters.slice(0, 6).map((cluster) => (
              <div key={cluster.clusterKey} style={{ fontSize: 13, opacity: 0.9 }}>
                {cluster.clusterKey} — {cluster.count}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#121936", borderRadius: 12, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Collaboration Receipts</h3>
          <div style={{ display: "grid", gap: 8, maxHeight: 280, overflow: "auto" }}>
            {receipts.map((receipt) => (
              <div key={receipt.id} style={{ border: "1px solid #27315f", borderRadius: 10, padding: 10, background: "#0f1730" }}>
                <div><strong>{receipt.action}</strong> · {receipt.status}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{receipt.from} → {receipt.to}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>{formatTime(receipt.timestamp)}</div>
                {receipt.notes ? <div style={{ fontSize: 12, marginTop: 4 }}>{receipt.notes}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default BrainDiagnosticsPanel;
