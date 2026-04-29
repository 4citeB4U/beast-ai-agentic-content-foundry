/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.ECHO.MEMORY.CORE
DESCRIPTION: Deterministic memory authority with receipts for cognition cycles.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

import { authoriseMemoryAccess } from './MemoryAuthorityPolicy';

export interface MemoryEntry {
  id: string;
  input: string;
  output: string;
  validation: {
    passed: boolean;
    score: number;
    issues: Array<{ code: string; message: string; severity: 'info' | 'warn' | 'error' }>;
  };
  timestamp: number;
}

export interface CollaborationReceipt {
  id: string;
  action: string;
  from: string;
  to: string;
  status: 'SUCCESS' | 'FAILURE';
  timestamp: number;
  notes?: string;
}

const memoryStore: MemoryEntry[] = [];
const receiptLog: CollaborationReceipt[] = [];

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function echoRead(query: string, requestId: string, requestingUnit = 'ORIGIN_CORE'): Promise<MemoryEntry[]> {
  const auth = authoriseMemoryAccess({
    requestId,
    requestingUnit: requestingUnit as any,
    operation: 'READ',
    path: '/memory/',
    receiptAttached: true,
  });

  if (!auth.allowed) return [];

  const lower = query.toLowerCase();
  return memoryStore.filter(m => m.input.toLowerCase().includes(lower)).slice(-5);
}

export async function echoWrite(entry: Omit<MemoryEntry, 'id' | 'timestamp'>, requestId: string): Promise<boolean> {
  const auth = authoriseMemoryAccess({
    requestId,
    requestingUnit: 'ECHO_CORE',
    operation: 'WRITE',
    path: '/memory/history/',
    receiptAttached: true,
    writePayload: entry,
  });

  if (!auth.allowed) return false;

  memoryStore.push({
    id: createId('mem'),
    input: entry.input,
    output: entry.output,
    validation: entry.validation,
    timestamp: Date.now(),
  });

  return true;
}

export function writeReceipt(r: Omit<CollaborationReceipt, 'id' | 'timestamp'>): void {
  receiptLog.push({
    id: createId('rcpt'),
    action: r.action,
    from: r.from,
    to: r.to,
    status: r.status,
    notes: r.notes,
    timestamp: Date.now(),
  });
}

export function getRecentReceipts(limit = 10): CollaborationReceipt[] {
  return receiptLog.slice(-Math.max(1, limit));
}
