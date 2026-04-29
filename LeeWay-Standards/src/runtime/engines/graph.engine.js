/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.GRAPH
TAG: ENGINE.GRAPH
WHAT = Graph engine for task dependency routing and execution planning
WHY = Orders multi-step jobs and decides what to execute next
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { ENGINE_SIGNATURES } from './signature.engine.js';
import { LeewayIntegrity } from './leeway.integrity.js';

export class TaskNode {
  constructor(id, type, payload = {}, dependencies = []) {
    this.id = id;
    this.type = type;
    this.payload = payload;
    this.dependencies = dependencies;
    this.status = 'pending';
    this.createdAt = new Date().toISOString();
  }
}

export class TaskGraph {
  constructor(id) {
    this.id = id;
    this.nodes = new Map();
    this.edges = new Map();
    this.createdAt = new Date().toISOString();
    this.completedAt = null;
  }

  addNode(node) {
    this.nodes.set(node.id, node);
    this.edges.set(node.id, new Set(node.dependencies));
    return node;
  }

  getReadyNodes() {
    return Array.from(this.nodes.values()).filter(node => {
      if (node.status !== 'pending') return false;
      const dependencies = this.edges.get(node.id) || new Set();
      return Array.from(dependencies).every(depId => this.nodes.get(depId)?.status === 'completed');
    });
  }

  markCompleted(nodeId, result) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = 'completed';
      node.completedAt = new Date().toISOString();
      node.result = result;
      return node;
    }
    return null;
  }

  isComplete() {
    return Array.from(this.nodes.values()).every(node => node.status === 'completed');
  }
}

export class GraphEngine {
  static signature = ENGINE_SIGNATURES.graph;

  static createTaskNode(type, payload, dependencies = []) {
    const id = `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new TaskNode(id, type, payload, dependencies);
  }

  static createTaskGraph(id) {
    return new TaskGraph(id);
  }

  static buildExecutionPlan(request, metadata = {}) {
    const graph = new TaskGraph(`graph-${Date.now().toString(36)}`);
    const startNode = this.createTaskNode('start', { request, metadata });
    const computeNode = this.createTaskNode('compute', { request, metadata });
    graph.addNode(startNode);
    graph.addNode(computeNode);
    graph.edges.set(computeNode.id, new Set([startNode.id]));
    return graph;
  }

  static async runGraph(graph, executor, context = {}) {
    const { audit } = context;

    await LeewayIntegrity.verifyEngine('graph', this.signature, audit);
    await LeewayIntegrity.enforceContext(context, audit);

    // Execution coupling: hard lock - execution requires integrity verification
    if (!context.integrityVerified) {
      throw new Error('EXECUTION_LOCKED: Integrity verification failed');
    }

    // Event-gated execution: allow events to block before execution
    const { EventEngine } = await import('../room-system/events.js');
    await EventEngine.emit('EXECUTION_REQUESTED', { graphId: graph.id }, context);

    const { pallium } = context;
    if (!pallium) {
      throw new Error('PALLIUM_NOT_INITIALIZED');
    }

    const executionContext = {
      ...context,
      memoryDB: pallium.getDB('memory'),
      vectorDB: pallium.getDB('vector'),
      fileDB: pallium.getDB('file'),
      logDB: pallium.getDB('log'),
    };

    while (!graph.isComplete()) {
      const ready = graph.getReadyNodes();
      if (ready.length === 0) {
        throw new Error('GraphEngine: no runnable nodes available, dependency deadlock detected');
      }
      for (const node of ready) {
        node.status = 'running';
        const result = await executor(node, executionContext);
        graph.markCompleted(node.id, result);
      }
    }
    graph.completedAt = new Date().toISOString();
    return graph;
  }
}
