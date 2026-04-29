/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.CENTRALGOVERNANCE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = CentralGovernance module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\CentralGovernance.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// CentralGovernance.ts
// Unified governance enforcement for the entire Agent Lee OS

import { eventBus } from './EventBus';

export type GovernanceDomain = 'agent' | 'operative' | 'worker' | 'llm' | 'file' | 'workflow' | 'database' | 'ui';
// Extended to match all fileOps actions
export type GovernanceAction = 'read' | 'write' | 'execute' | 'transfer' | 'delete' | 'approve' | 'audit' | 'create' | 'update';

export interface GovernanceRequest {
  domain: GovernanceDomain;
  action: GovernanceAction;
  actor: string; // agent, user, or system
  resource: string; // file, workflow, db, etc
  context?: Record<string, any>;
}

export interface GovernanceResult {
  allowed: boolean;
  reason?: string;
  policy: string;
}

export interface WriteIntentBlock {
  agentId: string;
  intent: string;
  action: string;
  zone: 'Z0' | 'Z1' | 'Z2';
}

// Example: Centralized policy table
const POLICY_TABLE: Record<GovernanceDomain, Record<GovernanceAction, { allowed: boolean; policy: string; }>> = {
  agent:    { read: { allowed: true, policy: 'open' }, write: { allowed: false, policy: 'immutable' }, execute: { allowed: true, policy: 'approved' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: false, policy: 'immutable' }, update: { allowed: false, policy: 'immutable' } },
  operative:{ read: { allowed: true, policy: 'open' }, write: { allowed: true, policy: 'approved' }, execute: { allowed: true, policy: 'approved' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: true, policy: 'approved' }, update: { allowed: true, policy: 'approved' } },
  worker:   { read: { allowed: true, policy: 'open' }, write: { allowed: true, policy: 'approved' }, execute: { allowed: true, policy: 'approved' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: true, policy: 'approved' }, update: { allowed: true, policy: 'approved' } },
  llm:      { read: { allowed: true, policy: 'open' }, write: { allowed: false, policy: 'immutable' }, execute: { allowed: true, policy: 'approved' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: false, policy: 'immutable' }, update: { allowed: false, policy: 'immutable' } },
  file:     { read: { allowed: true, policy: 'open' }, write: { allowed: true, policy: 'approved' }, execute: { allowed: false, policy: 'forbidden' }, transfer: { allowed: true, policy: 'approved' }, delete: { allowed: true, policy: 'approved' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: true, policy: 'approved' }, update: { allowed: true, policy: 'approved' } },
  workflow: { read: { allowed: true, policy: 'open' }, write: { allowed: true, policy: 'approved' }, execute: { allowed: true, policy: 'approved' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: true, policy: 'approved' }, update: { allowed: true, policy: 'approved' } },
  database: { read: { allowed: true, policy: 'open' }, write: { allowed: true, policy: 'approved' }, execute: { allowed: false, policy: 'forbidden' }, transfer: { allowed: false, policy: 'restricted' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: true, policy: 'council' }, audit: { allowed: true, policy: 'always' }, create: { allowed: false, policy: 'immutable' }, update: { allowed: false, policy: 'immutable' } },
  ui:       { read: { allowed: true, policy: 'open' }, write: { allowed: false, policy: 'immutable' }, execute: { allowed: false, policy: 'forbidden' }, transfer: { allowed: false, policy: 'forbidden' }, delete: { allowed: false, policy: 'immutable' }, approve: { allowed: false, policy: 'forbidden' }, audit: { allowed: true, policy: 'always' }, create: { allowed: false, policy: 'immutable' }, update: { allowed: false, policy: 'immutable' } },
};

// Zone-to-capability mapping for gating
const ZONE_CAPABILITIES: Record<string, string[]> = {
  'Z0': ['read', 'execute'],                          // Core read/execute only
  'Z1': ['read', 'write', 'execute', 'transfer'],     // Standard capabilities
  'Z2': ['read', 'write', 'execute', 'transfer', 'delete', 'approve'],  // Full capabilities
};

/**
 * CENTRAL GOVERNANCE CLASS
 * Static methods for governance enforcement
 */
export class CentralGovernance {
  /**
   * Build a write intent block from execution context
   */
  static buildWriteIntentBlock(context: {
    agentId: string;
    intent: string;
    action: string;
    zone: 'Z0' | 'Z1' | 'Z2';
  }): WriteIntentBlock {
    return {
      agentId: context.agentId,
      intent: context.intent,
      action: context.action,
      zone: context.zone
    };
  }

  /**
   * Enforce governance on a write intent block
   */
  static async enforceGovernance(block: WriteIntentBlock): Promise<boolean> {
    // Check zone capabilities
    const capabilities = ZONE_CAPABILITIES[block.zone] || [];
    
    // Map action to capability check
    const capabilityNeeded = block.action.split('.')[0]; // e.g., 'voice.speak' -> 'voice'
    const actionType = block.action.includes('write') ? 'write' :
                      block.action.includes('transfer') ? 'transfer' :
                      block.action.includes('delete') ? 'delete' :
                      block.action.includes('execute') ? 'execute' : 'read';
    
    const isAllowed = capabilities.includes(actionType);
    
    // Emit governance event
    eventBus.emit('governance:intent-check', {
      agentId: block.agentId,
      intent: block.intent,
      zone: block.zone,
      allowed: isAllowed
    });

    return isAllowed;
  }

  /**
   * Check if action is available in zone
   */
  static checkCapabilityGate(action: string, zone: 'Z0' | 'Z1' | 'Z2'): boolean {
    const capabilities = ZONE_CAPABILITIES[zone] || [];
    
    // Determine action type from action string
    const actionType = action.includes('read') ? 'read' :
                      action.includes('write') ? 'write' :
                      action.includes('transfer') ? 'transfer' :
                      action.includes('delete') ? 'delete' :
                      action.includes('execute') ? 'execute' : 'read';
    
    const isAllowed = capabilities.includes(actionType);
    
    // Emit for audit
    eventBus.emit('governance:capability-check', {
      action,
      zone,
      actionType,
      allowed: isAllowed
    });

    return isAllowed;
  }
}

/**
 * Legacy function export for backward compatibility
 */
export function enforceGovernance(req: GovernanceRequest): GovernanceResult {
  const canonicalDomain = req.domain === 'worker' ? 'operative' : req.domain;
  const domainPolicy = POLICY_TABLE[canonicalDomain]?.[req.action];
  if (!domainPolicy) {
    return { allowed: false, reason: 'No policy defined', policy: 'undefined' };
  }

  // Operatives must always have endpoint-bound execution context for mutating/executing actions.
  if (
    canonicalDomain === 'operative' &&
    ['write', 'execute', 'transfer', 'update', 'delete', 'approve'].includes(req.action)
  ) {
    const endpointId = String(req.context?.endpointId || '').trim();
    const assignmentId = String(req.context?.assignmentId || '').trim();

    if (!endpointId || !assignmentId) {
      return {
        allowed: false,
        reason: 'Operative actions require endpointId and assignmentId to enforce single-instance endpoint binding.',
        policy: 'endpoint-bound-required',
      };
    }
  }

  // Emit for audit
  eventBus.emit('governance:check', { ...req, domain: canonicalDomain, ...domainPolicy });
  return { allowed: domainPolicy.allowed, policy: domainPolicy.policy };
}
