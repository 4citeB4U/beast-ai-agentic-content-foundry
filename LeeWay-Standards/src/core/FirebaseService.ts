/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.SERVICE.FIREBASE
TAG: CORE.SERVICE.FIREBASE.GATEWAY

COLOR_ONION_HEX:
NEON=#4285F4
FLUO=#5A9AF5
PASTEL=#BFDBFE

ICON_ASCII:
family=lucide
glyph=server

5WH:
WHAT = Centralized Firebase service gateway for all AI and DB operations in Agent Lee system
WHY = Single source of truth for Firebase operations across components, ensures governance enforcement, enables background agent execution
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/FirebaseService.ts
WHEN = 2026
HOW = Static class wrapping Firestore, Auth, and Analytics with dependency injection support

AGENTS:
ASSESS
AUDIT
leeway
SECURITY

LICENSE:
MIT
*/

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  OAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  writeBatch,
  collectionGroup,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { MemoryDB } from './MemoryDB';
import { eventBus } from './EventBus';

// ─────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  agent?: string;
  streaming?: boolean;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentTaskRecord {
  id: string;
  userId: string;
  agentId: string;
  agentName: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'WAITING';
  objective: string;
  result?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  executedInBackground: boolean;
  metadata?: Record<string, any>;
}

export interface PalliumEntry {
  id: string;
  userId: string;
  timestamp: string;
  agentId: string;
  agentName: string;
  action: string;
  details: string;
  impact: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
}

export interface FirebaseServiceOptions {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

// ─────────────────────────────────────────────────────────────────────
// FIREBASE SERVICE
// ─────────────────────────────────────────────────────────────────────

export class FirebaseService {
  private static instance: FirebaseService;
  private auth: Auth;
  private db: Firestore;
  private leewayProvider: OAuthProvider;
  private currentUser: User | null = null;
  private listeners: Map<string, () => void> = new Map();

  private constructor(config: FirebaseServiceOptions) {
    const firebaseConfig = {
      apiKey: config.apiKey || (import.meta.env.VITE_FIREBASE_API_KEY as string),
      authDomain: config.authDomain || (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string),
      projectId: config.projectId || (import.meta.env.VITE_FIREBASE_PROJECT_ID as string),
      storageBucket: config.storageBucket || (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string),
      messagingSenderId: config.messagingSenderId || (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string),
      appId: config.appId || (import.meta.env.VITE_FIREBASE_APP_ID as string),
    };

    if (!firebaseConfig.apiKey) {
      console.error('[FirebaseService] CRITICAL: Firebase API Key missing. Authentication and database features will fail.');
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    this.auth = getAuth(app);
    this.db = getFirestore(app);
    this.leewayProvider = new OAuthProvider('github.com');

    // Set up auth state listener
    onAuthStateChanged(this.auth, (user) => {
      this.currentUser = user;
      eventBus.emit('firebase:auth-change', { user });
    });
  }

  static initialize(config: FirebaseServiceOptions = {}): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService(config);
    }
    return FirebaseService.instance;
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService({});
    }
    return FirebaseService.instance;
  }

  // ─────────────────────────────────────────────────────────────────────
  // AUTH METHODS
  // ─────────────────────────────────────────────────────────────────────

  async signInWithleeway(): Promise<User> {
    try {
      const result = await signInWithPopup(this.auth, this.leewayProvider);
      this.currentUser = result.user;
      eventBus.emit('firebase:signed-in', { user: result.user });
      return result.user;
    } catch (error) {
      eventBus.emit('firebase:auth-error', { error });
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getAuth(): Auth {
    return this.auth;
  }

  // ─────────────────────────────────────────────────────────────────────
  // CONVERSATION METHODS
  // ─────────────────────────────────────────────────────────────────────

  async saveMessage(
    userId: string,
    conversationId: string,
    message: ConversationMessage
  ): Promise<void> {
    try {
      const messageRef = doc(
        this.db,
        'conversations',
        conversationId,
        'messages',
        message.id
      );
      await setDoc(messageRef, {
        ...message,
        timestamp: message.timestamp || Timestamp.now(),
        createdAt: Timestamp.now(),
      });
      eventBus.emit('firebase:message-saved', { conversationId, messageId: message.id });
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'saveMessage', error });
      throw error;
    }
  }

  async getMessages(
    userId: string,
    conversationId: string,
    limitCount: number = 50
  ): Promise<ConversationMessage[]> {
    try {
      const messagesRef = collection(this.db, 'conversations', conversationId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ConversationMessage[];
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getMessages', error });
      throw error;
    }
  }

  onMessagesChange(
    conversationId: string,
    callback: (messages: ConversationMessage[]) => void
  ): () => void {
    const listenerKey = `messages_${conversationId}`;
    const messagesRef = collection(this.db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as ConversationMessage[];
      callback(messages);
    });

    this.listeners.set(listenerKey, unsubscribe);
    return unsubscribe;
  }

  // ─────────────────────────────────────────────────────────────────────
  // AGENT TASK METHODS
  // ─────────────────────────────────────────────────────────────────────

  async createTask(
    userId: string,
    task: Partial<AgentTaskRecord>
  ): Promise<AgentTaskRecord> {
    try {
      const taskId = task.id || `task_${uuidv4()}`;
      const taskRecord: AgentTaskRecord = {
        id: taskId,
        userId,
        agentId: task.agentId || 'unknown',
        agentName: task.agentName || 'Unknown Agent',
        status: task.status || 'QUEUED',
        objective: task.objective || '',
        createdAt: task.createdAt || new Date().toISOString(),
        executedInBackground: task.executedInBackground ?? false,
        metadata: task.metadata || {},
      };

      const taskRef = doc(this.db, 'users', userId, 'tasks', taskId);
      await setDoc(taskRef, taskRecord);
      eventBus.emit('firebase:task-created', { taskId, userId });
      return taskRecord;
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'createTask', error });
      throw error;
    }
  }

  async updateTask(
    userId: string,
    taskId: string,
    updates: Partial<AgentTaskRecord>
  ): Promise<void> {
    try {
      const taskRef = doc(this.db, 'users', userId, 'tasks', taskId);
      await updateDoc(taskRef, updates);
      eventBus.emit('firebase:task-updated', { taskId, userId });
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'updateTask', error });
      throw error;
    }
  }

  async getTask(userId: string, taskId: string): Promise<AgentTaskRecord | null> {
    try {
      const taskRef = doc(this.db, 'users', userId, 'tasks', taskId);
      const snapshot = await getDoc(taskRef);
      return snapshot.exists() ? (snapshot.data() as AgentTaskRecord) : null;
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getTask', error });
      throw error;
    }
  }

  async getUserTasks(
    userId: string,
    status?: string,
    limitCount: number = 50
  ): Promise<AgentTaskRecord[]> {
    try {
      const tasksRef = collection(this.db, 'users', userId, 'tasks');
      let q = query(tasksRef, orderBy('createdAt', 'desc'), limit(limitCount));

      if (status) {
        q = query(tasksRef, where('status', '==', status), orderBy('createdAt', 'desc'), limit(limitCount));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as AgentTaskRecord);
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getUserTasks', error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // MEMORY LAKE METHODS
  // ─────────────────────────────────────────────────────────────────────

  async logMemoryEntry(
    userId: string,
    entry: Partial<PalliumEntry>
  ): Promise<PalliumEntry> {
    const entryId = `memory_${uuidv4()}`;
    const memoryEntry: PalliumEntry = {
      id: entryId,
      userId,
      timestamp: entry.timestamp || new Date().toISOString(),
      agentId: entry.agentId || 'system',
      agentName: entry.agentName || 'System',
      action: entry.action || 'unknown',
      details: entry.details || '',
      impact: entry.impact || 'low',
      metadata: entry.metadata || {},
    };

    try {
      // 1. Always save to local MemoryDB first (Sovereign Recovery Layer)
      const localKey = `memory_lake_${userId}`;
      const existing = await MemoryDB.get<PalliumEntry[]>(localKey) || [];
      await MemoryDB.set(localKey, [memoryEntry, ...existing].slice(0, 1000));

      // 2. Sync to Firebase (Cloud Mirror)
      const entryRef = doc(this.db, 'users', userId, 'pallium', entryId);
      await setDoc(entryRef, memoryEntry);
      
      eventBus.emit('firebase:memory-logged', { entryId, userId });
      return memoryEntry;
    } catch (error) {
      console.warn('[FirebaseService] Cloud sync failed, entry preserved in local MemoryDB:', error);
      eventBus.emit('firebase:db-error', { operation: 'logMemoryEntry', error });
      // Return the entry anyway because it was saved locally
      return memoryEntry;
    }
  }

  async getMemoryEntries(
    userId: string,
    limitCount: number = 100
  ): Promise<PalliumEntry[]> {
    try {
      const memoryRef = collection(this.db, 'users', userId, 'pallium');
      const q = query(memoryRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => doc.data() as PalliumEntry);
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getMemoryEntries', error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // AGENT STATE METHODS (for background operations)
  // ─────────────────────────────────────────────────────────────────────

  async saveAgentState(
    userId: string,
    agentId: string,
    state: Record<string, any>
  ): Promise<void> {
    try {
      const stateRef = doc(this.db, 'users', userId, 'agentStates', agentId);
      await setDoc(
        stateRef,
        {
          ...state,
          lastUpdated: Timestamp.now(),
        },
        { merge: true }
      );
      eventBus.emit('firebase:agent-state-saved', { userId, agentId });
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'saveAgentState', error });
      throw error;
    }
  }

  async getAgentState(userId: string, agentId: string): Promise<Record<string, any> | null> {
    try {
      const stateRef = doc(this.db, 'users', userId, 'agentStates', agentId);
      const snapshot = await getDoc(stateRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getAgentState', error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // GENERIC DOCUMENT METHODS
  // ─────────────────────────────────────────────────────────────────────

  async setDocument(path: string, data: Record<string, any>, merge: boolean = false): Promise<void> {
    try {
      // Parse path like "users/userId/tasks/taskid"
      const parts = path.split('/')
      if (parts.length < 2) throw new Error('Invalid document path');
      
      const collectionName = parts[0];
      const documentPath = parts.slice(1);
      
      let ref: any = collection(this.db, collectionName);
      for (let i = 0; i < documentPath.length - 1; i += 2) {
        ref = collection(doc(ref as any, documentPath[i]), documentPath[i + 1]);
      }
      const docRef = doc(ref as any, documentPath[documentPath.length - 1]);
      
      await setDoc(docRef, data, { merge });
      eventBus.emit('firebase:doc-set', { path });
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'setDocument', path, error });
      throw error;
    }
  }

  async getDocument(path: string): Promise<Record<string, any> | null> {
    try {
      const parts = path.split('/')
      if (parts.length < 2) throw new Error('Invalid document path');
      
      const collectionName = parts[0];
      const documentPath = parts.slice(1);
      
      let ref: any = collection(this.db, collectionName);
      for (let i = 0; i < documentPath.length - 1; i += 2) {
        ref = collection(doc(ref as any, documentPath[i]), documentPath[i + 1]);
      }
      const docRef = doc(ref as any, documentPath[documentPath.length - 1]);
      
      const snapshot = await getDoc(docRef);
      return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'getDocument', path, error });
      throw error;
    }
  }

  async deleteDocument(path: string): Promise<void> {
    try {
      const parts = path.split('/')
      if (parts.length < 2) throw new Error('Invalid document path');
      
      const collectionName = parts[0];
      const documentPath = parts.slice(1);
      
      let ref: any = collection(this.db, collectionName);
      for (let i = 0; i < documentPath.length - 1; i += 2) {
        ref = collection(doc(ref as any, documentPath[i]), documentPath[i + 1]);
      }
      const docRef = doc(ref as any, documentPath[documentPath.length - 1]);
      
      await deleteDoc(docRef);
      eventBus.emit('firebase:doc-deleted', { path });
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'deleteDocument', path, error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // BATCH OPERATIONS
  // ─────────────────────────────────────────────────────────────────────

  async batch(operation: (batch: WriteBatch) => Promise<void>): Promise<void> {
    try {
      const b = writeBatch(this.db);
      await operation(b);
      await b.commit();
      eventBus.emit('firebase:batch-completed', {});
    } catch (error) {
      eventBus.emit('firebase:db-error', { operation: 'batch', error });
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ─────────────────────────────────────────────────────────────────────

  removeListener(key: string): void {
    const unsubscribe = this.listeners.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(key);
    }
  }

  removeAllListeners(): void {
    this.listeners.forEach((unsubscribe) => unsubscribe());
    this.listeners.clear();
  }

  // ─────────────────────────────────────────────────────────────────────
  // DIAGNOSTIC METHODS
  // ─────────────────────────────────────────────────────────────────────

  async testConnection(): Promise<boolean> {
    try {
      const testRef = doc(this.db, '_connection_probe', 'test');
      await getDoc(testRef);
      return true;
    } catch (error) {
      console.error('[FirebaseService] Connection test failed:', error);
      return false;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────

export const firebaseService = FirebaseService.getInstance();

export default FirebaseService;

