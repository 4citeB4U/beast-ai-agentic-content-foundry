/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.FILEOPS.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = fileOps module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\fileOps.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// Utility to get file history by file ID
export async function getFileHistory(fileId: string) {
  const meta = await MemoryDB.getFileMeta(fileId);
  return meta ? meta.history : [];
}

// Utility to get file meta (including all locations/copies)
export async function getFileMeta(fileId: string) {
  return await MemoryDB.getFileMeta(fileId);
}

// Utility to list all tracked files
export async function listAllTrackedFiles() {
  return await MemoryDB.listFileMetas();
}
// fileOps.ts
// File operation utilities with full traceability, monitoring, and Leeway 5W+How compliance

import { v4 as uuidv4 } from 'uuid';
import { eventBus } from './EventBus';
import { enforceGovernance } from './CentralGovernance';
import { MemoryDB } from './MemoryDB';

export interface FileMeta {
  id: string; // agent-style unique ID
  name: string;
  createdBy: string; // agent/user
  createdAt: string;
  lastModifiedBy: string;
  lastModifiedAt: string;
  location: string; // where (zone/path)
  why: string;
  how: string;
}

export interface FileEvent {
  meta: FileMeta;
  action: 'create' | 'read' | 'update' | 'delete' | 'transfer';
  actor: string;
  timestamp: string;
  details?: any;
}

export function createFileMeta({ name, createdBy, location, why, how }: Omit<FileMeta, 'id' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>): FileMeta {
  const now = new Date().toISOString();
  return {
    id: `file_${uuidv4()}`,
    name,
    createdBy,
    createdAt: now,
    lastModifiedBy: createdBy,
    lastModifiedAt: now,
    location,
    why,
    how,
  };
}

export async function logFileEvent(event: FileEvent) {
  // Enforce governance before logging
  const gov = enforceGovernance({
    domain: 'file',
    action: event.action as import('./CentralGovernance').GovernanceAction,
    actor: event.actor,
    resource: event.meta.id,
    context: event,
  });
  if (!gov.allowed) throw new Error(`Governance block: ${gov.policy} - ${gov.reason}`);
  eventBus.emit('file:event', event);

  // Persist to MemoryDB FileIndex
  const fileId = event.meta.id;
  let metaWithHistory = await MemoryDB.getFileMeta(fileId);
  if (!metaWithHistory) {
    metaWithHistory = { ...event.meta, history: [] };
  } else {
    // Update meta fields if changed
    metaWithHistory = {
      ...metaWithHistory,
      ...event.meta,
      history: metaWithHistory.history || []
    };
  }
  metaWithHistory.history.push(event);
  await MemoryDB.setFileMeta(fileId, metaWithHistory);
}
