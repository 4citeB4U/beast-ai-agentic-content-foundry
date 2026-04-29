/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.DATA.STORAGE
TAG: CORE.DATA.MEMORY.DB

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=database

5WH:
WHAT = IndexedDB-backed persistent memory store for Agent Lee
WHY = Enables offline-first storage of agent memory, voxel state, and session data
WHO = Agent Lee OS
WHERE = core/MemoryDB.ts
WHEN = 2026
HOW = Wraps IndexedDB via the idb library with a typed key-value schema and singleton connection

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
import { openDB, DBSchema, IDBPDatabase } from 'idb';


interface LeeDB extends DBSchema {
  kv: {
    key: string;
    value: any;
  };
  fileIndex: {
    key: string; // fileId
    value: import('./fileOps').FileMeta & { history: import('./fileOps').FileEvent[] };
  };
}


let dbPromise: Promise<IDBPDatabase<LeeDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<LeeDB>('agent_lee_db', 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains('fileIndex')) {
          db.createObjectStore('fileIndex');
        }
      },
    });
  }
  return dbPromise;
}

export const MemoryDB = {
  async get<T>(key: string): Promise<T | null> {
    const db = await getDb();
    const val = await db.get('kv', key);
    return val as T | null;
  },
  async set(key: string, value: any): Promise<void> {
    const db = await getDb();
    await db.put('kv', value, key);
  },
  async remove(key: string): Promise<void> {
    const db = await getDb();
    await db.delete('kv', key);
  },

  // FileIndex utilities
  async getFileMeta(fileId: string) {
    const db = await getDb();
    return db.get('fileIndex', fileId);
  },
  async setFileMeta(fileId: string, meta: import('./fileOps').FileMeta & { history: import('./fileOps').FileEvent[] }) {
    const db = await getDb();
    await db.put('fileIndex', meta, fileId);
  },
  async removeFileMeta(fileId: string) {
    const db = await getDb();
    await db.delete('fileIndex', fileId);
  },
  async listFileMetas() {
    const db = await getDb();
    return db.getAll('fileIndex');
  }
};
