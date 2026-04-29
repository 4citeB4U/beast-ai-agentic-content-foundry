export type CoreId =
  | "LEE_PRIME"
  | "ORIGIN_CORE"
  | "STRUCTURE_CORE"
  | "VERITAS_CORE"
  | "ECHO_CORE"
  | "VECTOR_CORE"
  | "SYNTHESIS_CORE";

export type Severity = "info" | "warn" | "error";

export interface ValidationIssue {
  code: string;
  message: string;
  severity: Severity;
  weight: number;
  source?: string;
}

export interface ValidationResult {
  passed: boolean;
  score: number;
  confidence: number;
  issues: ValidationIssue[];
  signals: Record<string, number | boolean | string>;
  disposition: "approve" | "revise" | "block";
}

export interface MemoryEntry {
  id: string;
  input: string;
  output: string;
  validation: ValidationResult;
  tags: string[];
  tokens: string[];
  clusterKey: string;
  timestamp: number;
}

export interface CollaborationReceipt {
  id: string;
  requestId: string;
  from: CoreId | string;
  to: CoreId | string;
  action: string;
  status: "SUCCESS" | "FAILURE" | "BLOCKED" | "REROUTED";
  notes?: string;
  timestamp: number;
}

export interface DiagnosticsEvent {
  id: string;
  requestId: string;
  phase:
    | "PERCEPTION"
    | "ORIGIN"
    | "NEGOTIATION"
    | "VECTOR"
    | "STRUCTURE"
    | "EXECUTION"
    | "VERITAS"
    | "ECHO"
    | "SYNTHESIS"
    | "DELIVERY";
  core: CoreId | string;
  status: "START" | "END" | "FAIL";
  message: string;
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface OriginDecision {
  primaryIntent: string;
  candidates: Array<{ intent: string; score: number; reasons: string[] }>;
  ambiguous: boolean;
  needsClarification: boolean;
  confidence: number;
  extractedEntities: Record<string, string[]>;
  recommendedNextCore: "STRUCTURE_CORE" | "VECTOR_CORE" | "ECHO_CORE" | "LEE_PRIME";
}

export interface NegotiationResult {
  finalIntent: string;
  route: Array<CoreId | string>;
  requiresRag: boolean;
  requiresMemoryRecall: boolean;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  reasons: string[];
}

export interface ExecutionState {
  requestId: string;
  input: string;
  intent?: string;
  origin?: OriginDecision;
  negotiation?: NegotiationResult;
  context: Record<string, any>;
  plan: string[];
  results: Record<string, any>;
  validation: ValidationResult;
  meta: {
    retries: number;
    reroutes: number;
    severity: Severity;
    activeCore?: CoreId | string;
  };
}
