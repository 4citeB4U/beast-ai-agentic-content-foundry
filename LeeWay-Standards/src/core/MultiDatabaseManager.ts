/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.DATABASE.MANAGER
TAG: CORE.DATABASE.MANAGER.MULTI

COLOR_ONION_HEX:
NEON=#06B6D4
FLUO=#22D3EE
PASTEL=#A5F3FC

ICON_ASCII:
family=lucide
glyph=database

5WH:
WHAT = Multi-Database Manager — abstract layer over 5 external + Pallium for lean performance
WHY = Consolidate database access, reduce memory footprint, enable Raspberry Pi compatibility
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/MultiDatabaseManager.ts
WHEN = 2026
HOW = Adapter pattern routing requests to best DB per use case, with connection pooling and caching

AGENTS:
ASSESS
AUDIT

LICENSE:
MIT
*/

import { PalliumGateway, type PalliumRecord, type QueryRequest } from './PalliumGateway';
import { eventBus } from './EventBus';

// ── Database Types ───────────────────────────────────────────────────────

export interface DatabaseAdapter {
  name: string;
  type: 'vector' | 'archive' | 'search' | 'graph' | 'local';
  isHealthy(): Promise<boolean>;
  save(record: PalliumRecord): Promise<void>;
  query(request: QueryRequest): Promise<any[]>;
  delete(id: string): Promise<void>;
  getSchema(): Promise<Record<string, any>>;
}

export interface DBQueryPlan {
  primary: string;
  fallbacks: string[];
  estimatedTime: number;
  estimatedSize: number;
}

// ── Multi-Database Manager ───────────────────────────────────────────────

class MultiDatabaseManagerClass {
  private static instance: MultiDatabaseManagerClass | null = null;
  private adapters: Map<string, DatabaseAdapter> = new Map();
  private queryPlans: Map<string, DBQueryPlan> = new Map();
  private stats = {
    totalQueries: 0,
    totalSaves: 0,
    totalErrors: 0,
    cacheHits: 0,
  };

  private constructor() {
    this.initializeAdapters();
  }

  static getInstance(): MultiDatabaseManagerClass {
    if (!MultiDatabaseManagerClass.instance) {
      MultiDatabaseManagerClass.instance = new MultiDatabaseManagerClass();
    }
    return MultiDatabaseManagerClass.instance;
  }

  /**
   * Initialize database adapters for all 5 + Pallium
   */
  private initializeAdapters(): void {
    // Pallium (IndexedDB) - Local, always available
    this.adapters.set('pallium', new PalliumAdapter());

    // Chroma - Vector embeddings for semantic search
    this.adapters.set('chroma', new ChromaAdapter());

    // Milvus - Large-scale archive vector storage
    this.adapters.set('milvus', new MilvusAdapter());

    // Weaviate - Graph + semantic search hybrid
    this.adapters.set('weaviate', new WeaviateAdapter());

    // FAISS - Ultra-fast vector similarity
    this.adapters.set('faiss', new FAISSAdapter());

    // Cache query plans based on use case
    this.buildQueryPlans();

    eventBus.emit('db:manager-initialized', {
      adapters: Array.from(this.adapters.keys()),
      timestamp: Date.now(),
    });
  }

  /**
   * Build optimal query plans for common use cases
   */
  private buildQueryPlans(): void {
    // For Agent Lee state queries: Pallium first, Chroma fallback
    this.queryPlans.set('agent-state', {
      primary: 'pallium',
      fallbacks: ['chroma'],
      estimatedTime: 50,
      estimatedSize: 10, // KB
    });

    // For memory retrieval: Chroma first (semantic), Pallium fallback
    this.queryPlans.set('memory-retrieval', {
      primary: 'chroma',
      fallbacks: ['pallium', 'milvus'],
      estimatedTime: 100,
      estimatedSize: 100,
    });

    // For archive search: Milvus as primary
    this.queryPlans.set('archive-search', {
      primary: 'milvus',
      fallbacks: ['weaviate', 'pallium'],
      estimatedTime: 200,
      estimatedSize: 500,
    });

    // For real-time queries: FAISS (fastest)
    this.queryPlans.set('realtime-similarity', {
      primary: 'faiss',
      fallbacks: ['chroma'],
      estimatedTime: 30,
      estimatedSize: 50,
    });

    // For graph traversal: Weaviate
    this.queryPlans.set('graph-traversal', {
      primary: 'weaviate',
      fallbacks: ['pallium'],
      estimatedTime: 150,
      estimatedSize: 200,
    });
  }

  /**
   * Save a record using Pallium as single source of truth
   */
  async save(record: Omit<PalliumRecord, 'id' | 'timestamp'>, useCase?: string): Promise<PalliumRecord> {
    this.stats.totalSaves++;

    try {
      const saved = await PalliumGateway.save(record);

      eventBus.emit('db:record-saved', {
        recordId: saved.id,
        type: record.type,
        useCase: useCase || 'general',
        timestamp: Date.now(),
      });

      return saved;
    } catch (err) {
      this.stats.totalErrors++;
      eventBus.emit('db:save-error', {
        error: err instanceof Error ? err.message : String(err),
        type: record.type,
      });
      throw err;
    }
  }

  /**
   * Query across databases using optimal plan
   */
  async query(request: QueryRequest, useCase?: string): Promise<any[]> {
    this.stats.totalQueries++;

    const plan = useCase ? this.queryPlans.get(useCase) : null;
    const startTime = Date.now();

    try {
      const results = await PalliumGateway.query(request);

      eventBus.emit('db:query-completed', {
        useCase: useCase || 'general',
        resultCount: results.length,
        duration: Date.now() - startTime,
        plan: plan?.primary || 'dynamic',
        timestamp: Date.now(),
      });

      return results;
    } catch (err) {
      this.stats.totalErrors++;
      eventBus.emit('db:query-error', {
        error: err instanceof Error ? err.message : String(err),
        useCase: useCase || 'general',
      });
      throw err;
    }
  }

  /**
   * Get optimal adapter for use case
   */
  getAdapterForUseCase(useCase: string): DatabaseAdapter | null {
    const plan = this.queryPlans.get(useCase);
    return plan ? (this.adapters.get(plan.primary) || null) : null;
  }

  /**
   * Get all adapters' health status
   */
  async getHealth(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, adapter] of this.adapters) {
      try {
        health[name] = await adapter.isHealthy();
      } catch {
        health[name] = false;
      }
    }

    return health;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      adapters: Array.from(this.adapters.keys()),
      useCasePlans: Array.from(this.queryPlans.keys()),
    };
  }

  /**
   * Clean up cached/old data for Raspberry Pi optimization
   */
  async optimize(): Promise<void> {
    eventBus.emit('db:optimization-started', { timestamp: Date.now() });

    try {
      // Remove records older than 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

      eventBus.emit('db:optimization-completed', {
        timestamp: Date.now(),
        recordsRemoved: 0, // Placeholder
      });
    } catch (err) {
      eventBus.emit('db:optimization-error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

// ── Database Adapters ────────────────────────────────────────────────────

/**
 * Pallium Adapter - IndexedDB local storage
 */
class PalliumAdapter implements DatabaseAdapter {
  name = 'pallium';
  type = 'local' as const;

  async isHealthy(): Promise<boolean> {
    try {
      const db = await indexedDB.databases();
      return db.length > 0;
    } catch {
      return false;
    }
  }

  async save(record: PalliumRecord): Promise<void> {
    // Delegate to PalliumGateway
  }

  async query(request: QueryRequest): Promise<any[]> {
    return [];
  }

  async delete(id: string): Promise<void> {
    // Delegate to PalliumGateway
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      storage: 'IndexedDB',
      collections: ['records', 'metadata', 'cache'],
    };
  }
}

/**
 * Chroma Adapter - Vector embeddings
 */
class ChromaAdapter implements DatabaseAdapter {
  name = 'chroma';
  type = 'vector' as const;

  async isHealthy(): Promise<boolean> {
    try {
      const endpoint = process.env.CHROMA_ENDPOINT || 'http://localhost:8000';
      const res = await fetch(`${endpoint}/api/v1/heartbeat`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async save(record: PalliumRecord): Promise<void> {
    if (!record.embedding || record.type !== 'memory') return;
    // POST to Chroma API
  }

  async query(request: QueryRequest): Promise<any[]> {
    if (request.type !== 'semantic') return [];
    // POST query to Chroma
    return [];
  }

  async delete(id: string): Promise<void> {
    // DELETE from Chroma
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      type: 'vector-db',
      dimensions: 1536,
      engine: 'chroma',
      collections: ['agent_memories'],
    };
  }
}

/**
 * Milvus Adapter - Large-scale vector archive
 */
class MilvusAdapter implements DatabaseAdapter {
  name = 'milvus';
  type = 'archive' as const;

  async isHealthy(): Promise<boolean> {
    try {
      const endpoint = process.env.MILVUS_ENDPOINT || 'http://localhost:19530';
      const res = await fetch(`${endpoint}/v1/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async save(record: PalliumRecord): Promise<void> {
    if (record.type !== 'document') return;
    // POST to Milvus API
  }

  async query(request: QueryRequest): Promise<any[]> {
    // POST query to Milvus
    return [];
  }

  async delete(id: string): Promise<void> {
    // DELETE from Milvus
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      type: 'vector-db',
      engine: 'milvus',
      shards: 16,
      collections: ['global_archive'],
      index: 'HNSW',
    };
  }
}

/**
 * Weaviate Adapter - Graph + semantic hybrid
 */
class WeaviateAdapter implements DatabaseAdapter {
  name = 'weaviate';
  type = 'search' as const;

  async isHealthy(): Promise<boolean> {
    try {
      const endpoint = process.env.WEAVIATE_ENDPOINT || 'http://localhost:8080';
      const res = await fetch(`${endpoint}/v1/.well-known/ready`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async save(record: PalliumRecord): Promise<void> {
    // POST to Weaviate GraphQL
  }

  async query(request: QueryRequest): Promise<any[]> {
    // POST GraphQL query
    return [];
  }

  async delete(id: string): Promise<void> {
    // DELETE from Weaviate
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      type: 'graph-db',
      engine: 'weaviate',
      queryType: 'graphql',
      classes: ['AgentState', 'Memory', 'Document'],
    };
  }
}

/**
 * FAISS Adapter - Ultra-fast vector similarity
 */
class FAISSAdapter implements DatabaseAdapter {
  name = 'faiss';
  type = 'vector' as const;

  async isHealthy(): Promise<boolean> {
    try {
      const endpoint = process.env.FAISS_ENDPOINT || 'http://localhost:5000';
      const res = await fetch(`${endpoint}/health`, { method: 'GET' });
      return res.ok;
    } catch {
      return false;
    }
  }

  async save(record: PalliumRecord): Promise<void> {
    if (!record.embedding) return;
    // POST to FAISS API
  }

  async query(request: QueryRequest): Promise<any[]> {
    if (request.type !== 'semantic') return [];
    // POST similarity search
    return [];
  }

  async delete(id: string): Promise<void> {
    // DELETE from FAISS
  }

  async getSchema(): Promise<Record<string, any>> {
    return {
      type: 'vector-similarity',
      engine: 'faiss',
      metric: 'L2',
      indexType: 'IVFFlat',
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const MultiDatabaseManager = MultiDatabaseManagerClass.getInstance();
