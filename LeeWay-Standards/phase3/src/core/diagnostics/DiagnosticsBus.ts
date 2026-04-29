import { DiagnosticsEvent } from "@/types/runtime";

const listeners = new Set<(event: DiagnosticsEvent) => void>();
const history: DiagnosticsEvent[] = [];

function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function publishDiagnostics(
  event: Omit<DiagnosticsEvent, "id" | "timestamp">,
): DiagnosticsEvent {
  const enriched: DiagnosticsEvent = {
    ...event,
    id: nextId(),
    timestamp: Date.now(),
  };
  history.push(enriched);
  if (history.length > 500) history.shift();
  listeners.forEach((listener) => listener(enriched));
  return enriched;
}

export function subscribeDiagnostics(listener: (event: DiagnosticsEvent) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDiagnosticsHistory(limit = 100): DiagnosticsEvent[] {
  return history.slice(-limit);
}

export function clearDiagnosticsHistory(): void {
  history.length = 0;
}
