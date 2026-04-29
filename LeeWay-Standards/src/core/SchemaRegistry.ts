/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.DATABASE.SCHEMA
TAG: CORE.DATABASE.SCHEMA.REGISTRY

COLOR_ONION_HEX:
NEON=#8B5CF6
FLUO=#A78BFA
PASTEL=#E9D5FF

ICON_ASCII:
family=lucide
glyph=book-open

5WH:
WHAT = Schema Registry — Pallium-hosted schema discovery and validation for all 5 external DBs
WHY = Enable dynamic schema queries, agent-driven schema evolution, runtime type safety
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/SchemaRegistry.ts
WHEN = 2026
HOW = Singleton managing schema definitions, versioning, validation, and discovery across all DBs

AGENTS:
ASSESS
AUDIT
SHIELD

LICENSE:
MIT
*/

import { PalliumGateway, type PalliumRecord } from './PalliumGateway';
import { eventBus } from './EventBus';

// ── Types ───────────────────────────────────────────────────────────────

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'vector';
  required?: boolean;
  description?: string;
  vectorDim?: number; // for vector fields
  index?: boolean;
  searchable?: boolean;
}

export interface CollectionSchema {
  name: string;
  version: string;
  description: string;
  fields: FieldSchema[];
  primaryKey?: string;
  indexes?: string[];
  ttl?: number; // time-to-live in seconds
  requirements?: {
    minVersion?: string;
    maxSize?: number;
    embedding?: string;
  };
}

export interface DatabaseSchema {
  database: string;
  version: string;
  lastUpdated: number;
  collections: CollectionSchema[];
}

// ── Schema Registry ──────────────────────────────────────────────────────

class SchemaRegistryClass {
  private static instance: SchemaRegistryClass | null = null;
  private schemas: Map<string, DatabaseSchema> = new Map();
  private validators: Map<string, (data: any) => boolean> = new Map();

  private constructor() {
    this.initializeSchemas();
  }

  static getInstance(): SchemaRegistryClass {
    if (!SchemaRegistryClass.instance) {
      SchemaRegistryClass.instance = new SchemaRegistryClass();
    }
    return SchemaRegistryClass.instance;
  }

  /**
   * Initialize base schemas for all 5 + Pallium
   */
  private initializeSchemas(): void {
    // Pallium Schema
    this.registerSchema('pallium', {
      database: 'pallium',
      version: '1.0.0',
      lastUpdated: Date.now(),
      collections: [
        {
          name: 'records',
          version: '1.0.0',
          description: 'Primary record storage for all Agent Lee data',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'type', type: 'string', required: true, searchable: true },
            { name: 'timestamp', type: 'number', required: true, index: true },
            { name: 'userId', type: 'string', searchable: true },
            { name: 'agentId', type: 'string', searchable: true },
            { name: 'data', type: 'object', required: true },
            { name: 'tags', type: 'array', searchable: true },
            { name: 'ttl', type: 'number' },
          ],
          primaryKey: 'id',
          ttl: 2592000, // 30 days
        },
        {
          name: 'metadata',
          version: '1.0.0',
          description: 'Metadata and system information',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'key', type: 'string', required: true, searchable: true },
            { name: 'value', type: 'object', required: true },
            { name: 'timestamp', type: 'number', required: true },
          ],
          primaryKey: 'id',
        },
      ],
    });

    // Chroma Schema
    this.registerSchema('chroma', {
      database: 'chroma',
      version: '0.4.0',
      lastUpdated: Date.now(),
      collections: [
        {
          name: 'agent_memories',
          version: '1.0.0',
          description: 'Semantic memory embeddings for Agent Lee',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'embedding', type: 'vector', required: true, vectorDim: 1536 },
            { name: 'metadata', type: 'object' },
            { name: 'document', type: 'string' },
          ],
          primaryKey: 'id',
          requirements: {
            embedding: 'text-embedding-3-small',
          },
        },
      ],
    });

    // Milvus Schema
    this.registerSchema('milvus', {
      database: 'milvus',
      version: '2.4.0',
      lastUpdated: Date.now(),
      collections: [
        {
          name: 'global_archive',
          version: '1.0.0',
          description: 'Large-scale document archive with vector embeddings',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'vector', type: 'vector', required: true, vectorDim: 1536 },
            { name: 'text', type: 'string', required: true, searchable: true },
            { name: 'metadata', type: 'object' },
            { name: 'source', type: 'string', searchable: true },
            { name: 'timestamp', type: 'number', index: true },
          ],
          primaryKey: 'id',
          indexes: ['vector', 'timestamp', 'source'],
          requirements: {
            minVersion: '2.3.0',
          },
        },
      ],
    });

    // Weaviate Schema
    this.registerSchema('weaviate', {
      database: 'weaviate',
      version: '1.0.0',
      lastUpdated: Date.now(),
      collections: [
        {
          name: 'AgentState',
          version: '1.0.0',
          description: 'Agent state and configuration graph',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'agentName', type: 'string', required: true, searchable: true },
            { name: 'status', type: 'string', searchable: true },
            { name: 'config', type: 'object' },
            { name: 'lastUpdate', type: 'date', index: true },
          ],
          primaryKey: 'id',
        },
        {
          name: 'Memory',
          version: '1.0.0',
          description: 'Episodic and semantic memories with graph relationships',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'content', type: 'string', searchable: true },
            { name: 'type', type: 'string', searchable: true },
            { name: 'relatedTo', type: 'array' },
            { name: 'created', type: 'date', index: true },
          ],
          primaryKey: 'id',
        },
      ],
    });

    // FAISS Schema
    this.registerSchema('faiss', {
      database: 'faiss',
      version: '1.7.0',
      lastUpdated: Date.now(),
      collections: [
        {
          name: 'vector_index',
          version: '1.0.0',
          description: 'Ultra-fast vector similarity index',
          fields: [
            { name: 'id', type: 'string', required: true, index: true },
            { name: 'vector', type: 'vector', required: true, vectorDim: 768 },
            { name: 'payload', type: 'object' },
          ],
          primaryKey: 'id',
          requirements: {
            maxSize: 1000000,
          },
        },
      ],
    });

    eventBus.emit('schema:initialized', {
      databases: Array.from(this.schemas.keys()),
      timestamp: Date.now(),
    });
  }

  /**
   * Register or update a database schema
   */
  registerSchema(database: string, schema: DatabaseSchema): void {
    this.schemas.set(database, schema);

    eventBus.emit('schema:registered', {
      database,
      version: schema.version,
      collectionCount: schema.collections.length,
      timestamp: Date.now(),
    });

    // Compile validators for this schema
    this.compileValidators(database, schema);
  }

  /**
   * Get schema for a specific database
   */
  getSchema(database: string): DatabaseSchema | null {
    return this.schemas.get(database) || null;
  }

  /**
   * Get schema for a specific collection
   */
  getCollectionSchema(database: string, collection: string): CollectionSchema | null {
    const dbSchema = this.schemas.get(database);
    if (!dbSchema) return null;
    return dbSchema.collections.find(c => c.name === collection) || null;
  }

  /**
   * Validate data against schema
   */
  validate(database: string, collection: string, data: any): { valid: boolean; errors: string[] } {
    const collectionSchema = this.getCollectionSchema(database, collection);
    if (!collectionSchema) {
      return { valid: false, errors: [`Collection ${collection} not found in ${database}`] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of collectionSchema.fields) {
      if (field.required && !(field.name in data)) {
        errors.push(`Missing required field: ${field.name}`);
      }
    }

    // Check field types
    for (const field of collectionSchema.fields) {
      if (field.name in data) {
        const value = data[field.name];
        if (!this.isValidType(value, field.type)) {
          errors.push(`Invalid type for ${field.name}: expected ${field.type}, got ${typeof value}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all registered schemas (discovery)
   */
  getAllSchemas(): Record<string, DatabaseSchema> {
    return Object.fromEntries(this.schemas);
  }

  /**
   * Get schema version history (placeholder)
   */
  getVersionHistory(database: string): DatabaseSchema[] {
    const schema = this.schemas.get(database);
    return schema ? [schema] : [];
  }

  /**
   * Create a new collection schema
   */
  createCollectionSchema(
    database: string,
    collection: CollectionSchema
  ): void {
    const dbSchema = this.schemas.get(database);
    if (!dbSchema) {
      throw new Error(`Database ${database} not found`);
    }

    if (dbSchema.collections.find(c => c.name === collection.name)) {
      throw new Error(`Collection ${collection.name} already exists`);
    }

    dbSchema.collections.push(collection);
    dbSchema.lastUpdated = Date.now();

    eventBus.emit('schema:collection-created', {
      database,
      collection: collection.name,
      fieldCount: collection.fields.length,
      timestamp: Date.now(),
    });
  }

  /**
   * Update a collection schema
   */
  updateCollectionSchema(
    database: string,
    collectionName: string,
    updates: Partial<CollectionSchema>
  ): void {
    const dbSchema = this.schemas.get(database);
    if (!dbSchema) {
      throw new Error(`Database ${database} not found`);
    }

    const collection = dbSchema.collections.find(c => c.name === collectionName);
    if (!collection) {
      throw new Error(`Collection ${collectionName} not found`);
    }

    Object.assign(collection, updates);
    dbSchema.lastUpdated = Date.now();

    eventBus.emit('schema:collection-updated', {
      database,
      collection: collectionName,
      timestamp: Date.now(),
    });
  }

  /**
   * Export schema to Pallium for discovery
   */
  async exportSchemaToPallium(): Promise<void> {
    try {
      for (const [dbName, schema] of this.schemas) {
        await PalliumGateway.save({
          type: 'metadata',
          data: schema,
          tags: ['schema', 'registry', dbName],
        });
      }

      eventBus.emit('schema:exported', {
        databases: Array.from(this.schemas.keys()),
        timestamp: Date.now(),
      });
    } catch (err) {
      eventBus.emit('schema:export-error', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Compile field validators
   */
  private compileValidators(database: string, schema: DatabaseSchema): void {
    for (const collection of schema.collections) {
      const key = `${database}:${collection.name}`;
      this.validators.set(key, (data: any) => {
        const result = this.validate(database, collection.name, data);
        return result.valid;
      });
    }
  }

  /**
   * Check if value matches field type
   */
  private isValidType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number';
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      case 'date':
        return value instanceof Date || typeof value === 'number';
      case 'vector':
        return Array.isArray(value) && value.every(v => typeof v === 'number');
      default:
        return true;
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const SchemaRegistry = SchemaRegistryClass.getInstance();
