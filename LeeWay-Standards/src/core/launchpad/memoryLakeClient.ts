/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.LAUNCHPAD.PERSISTENCE
TAG: CORE.LAUNCHPAD.PALLIUM.CLIENT

5WH:
WHAT = Memory Lake client for Launch Pad — offline-first IndexedDB CRUD for launches/bundles/jobs/events/connections
WHY = Single access point for all launchpad persistence; subscribable so UI updates in real time
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/launchpad/palliumClient.ts
WHEN = 2026
HOW = idb-backed typed stores with an internal EventEmitter for live subscriptions

LICENSE: MIT
*/

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  LaunchRecord, DeployableBundle, LaunchJob,
  TraceEvent, ProviderConnection
} from './types';

// ── DB Schema ───────────────────────────────────────────────────

interface LaunchPadDB extends DBSchema {
  launches:    { key: string; value: LaunchRecord };
  bundles:     { key: string; value: DeployableBundle; indexes: { 'by-launch': string } };
  jobs:        { key: string; value: LaunchJob;        indexes: { 'by-launch': string } };
  events:      { key: string; value: TraceEvent;       indexes: { 'by-trace': string } };
  connections: { key: string; value: ProviderConnection };
}

const DB_NAME = 'agent-lee-launchpad';
const DB_VERSION = 1;

let _db: Promise<IDBPDatabase<LaunchPadDB>> | null = null;

function getDb(): Promise<IDBPDatabase<LaunchPadDB>> {
  if (!_db) {
    _db = openDB<LaunchPadDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('launches')) {
          db.createObjectStore('launches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('bundles')) {
          const bs = db.createObjectStore('bundles', { keyPath: 'id' });
          bs.createIndex('by-launch', 'launch_id');
        }
        if (!db.objectStoreNames.contains('jobs')) {
          const js = db.createObjectStore('jobs', { keyPath: 'id' });
          js.createIndex('by-launch', 'launch_id');
        }
        if (!db.objectStoreNames.contains('events')) {
          const es = db.createObjectStore('events', { keyPath: 'span_id' });
          es.createIndex('by-trace', 'trace_id');
        }
        if (!db.objectStoreNames.contains('connections')) {
          db.createObjectStore('connections', { keyPath: 'provider_id' });
        }
      },
    });
  }
  return _db;
}

// ── Subscription System ─────────────────────────────────────────

type Topic = 'launches' | 'jobs' | 'events' | 'connections' | 'bundles';
type SubCallback = (topic: Topic) => void;

const subs = new Map<Topic, Set<SubCallback>>();

function notify(topic: Topic) {
  subs.get(topic)?.forEach(cb => cb(topic));
}

// ── Public API ──────────────────────────────────────────────────

export const palliumClient = {

  // ── Launches ──────────────────────────────────────────────────

  launches: {
    async list(): Promise<LaunchRecord[]> {
      const db = await getDb();
      return db.getAll('launches');
    },
    async get(id: string): Promise<LaunchRecord | undefined> {
      const db = await getDb();
      return db.get('launches', id);
    },
    async upsert(record: LaunchRecord): Promise<void> {
      const db = await getDb();
      await db.put('launches', { ...record, updated_at: Date.now() });
      notify('launches');
    },
    async delete(id: string): Promise<void> {
      const db = await getDb();
      await db.delete('launches', id);
      notify('launches');
    },
  },

  // ── Bundles ───────────────────────────────────────────────────

  bundles: {
    async list(launchId?: string): Promise<DeployableBundle[]> {
      const db = await getDb();
      if (launchId) return db.getAllFromIndex('bundles', 'by-launch', launchId);
      return db.getAll('bundles');
    },
    async get(id: string): Promise<DeployableBundle | undefined> {
      const db = await getDb();
      return db.get('bundles', id);
    },
    async upsert(bundle: DeployableBundle): Promise<void> {
      const db = await getDb();
      await db.put('bundles', bundle);
      notify('bundles');
    },
  },

  // ── Jobs ──────────────────────────────────────────────────────

  jobs: {
    async list(launchId?: string): Promise<LaunchJob[]> {
      const db = await getDb();
      if (launchId) return db.getAllFromIndex('jobs', 'by-launch', launchId);
      return db.getAll('jobs');
    },
    async get(id: string): Promise<LaunchJob | undefined> {
      const db = await getDb();
      return db.get('jobs', id);
    },
    async create(job: LaunchJob): Promise<void> {
      const db = await getDb();
      await db.put('jobs', job);
      notify('jobs');
    },
    async update(job: LaunchJob): Promise<void> {
      const db = await getDb();
      await db.put('jobs', { ...job, updated_at: Date.now() });
      notify('jobs');
    },
  },

  // ── Events ────────────────────────────────────────────────────

  events: {
    async list(traceId?: string): Promise<TraceEvent[]> {
      const db = await getDb();
      if (traceId) return db.getAllFromIndex('events', 'by-trace', traceId);
      return db.getAll('events');
    },
    async append(event: TraceEvent): Promise<void> {
      const db = await getDb();
      await db.put('events', event);
      notify('events');
    },
  },

  // ── Connections ───────────────────────────────────────────────

  connections: {
    async list(): Promise<ProviderConnection[]> {
      const db = await getDb();
      return db.getAll('connections');
    },
    async get(providerId: string): Promise<ProviderConnection | undefined> {
      const db = await getDb();
      return db.get('connections', providerId);
    },
    async upsert(conn: ProviderConnection): Promise<void> {
      const db = await getDb();
      await db.put('connections', conn);
      notify('connections');
    },
  },

  // ── Subscriptions ─────────────────────────────────────────────

  subscribe(topic: Topic, callback: SubCallback): () => void {
    if (!subs.has(topic)) subs.set(topic, new Set());
    subs.get(topic)!.add(callback);
    return () => subs.get(topic)?.delete(callback);
  },
};
