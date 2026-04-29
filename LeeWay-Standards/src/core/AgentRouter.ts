/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.ROUTER
TAG: AI.ORCHESTRATION.CORE.AGENTROUTER.CLASSIFIER

COLOR_ONION_HEX:
NEON=#8B5CF6
FLUO=#A78BFA
PASTEL=#DDD6FE

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = Central intent classifier and task router for all agent dispatch
WHY = Routes user messages to the correct specialized agent using deterministic sovereign classification
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/AgentRouter.ts
WHEN = 2026
HOW = Static class using deterministic rules and AgentCognition to classify tasks, maintain conversation history, and dispatch to agents

AGENTS:
ASSESS
AUDIT
leeway
ROUTER

LICENSE:
MIT
*/

// core/AgentRouter.ts
// Routes user intents to the correct agent.
// Uses deterministic classification, then dispatches to the right team member.

import { AgentCognition } from './AgentCognitionProvider';
import { buildAgentLeeCorePrompt } from './agent_lee_prompt_assembler';
import { 
  type WorkflowId, 
  WORKFLOWS, 
  type Zone, 
  type TaskRecord, 
  LEE_PRIME_GOVERNANCE_PROMPT, 
  parseLeePrimeCommand 
} from './GovernanceContract';
import { TaskGraph } from './TaskGraph';
import { eventBus } from './EventBus';

export interface TaskIntent {
  agent: string;
  task: string;
  requiresVM: boolean;
  requiresVoice: boolean;
  requiresSearch: boolean;
  requiresCode: boolean;
  requiresImage: boolean;
  workflow: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  style?: 'normal' | 'poem' | 'story' | 'riddle' | 'simple';
}

const CLASSIFICATION_SYSTEM = `${buildAgentLeeCorePrompt()}

You are Agent Lee's task router. Classify the user's request and return ONLY valid JSON.
遵循以下分类原则:
- VM-first: Everything requiring code execution, builds, or deployment must use Nova or Nexus.
- Research: All search and external exploration must use Atlas.
- Memory: Historical recall or dream synthesis must use Sage.
- Security: Error diagnosis and self-healing must use Shield.
- Visual: UI design and voxel manifestation must use Pixel.
- Social: Translation and group facilitation must use Aria.
- Voice/Emotion: Tone detection and stylistic adaptation must use Echo.
- Orchestration: Complex multi-step planning defaults to AgentLee.

Agent capabilities:
- Atlas: web search, GitHub/HuggingFace/Discord scanning, research, reports
- Nova: writing code, debugging, building apps, games, scripts
- Echo: voice commands, language settings, emotion detection
- Sage: memory queries, saving notes, historical context, dream reports
- Shield: security checks, system health, self-healing requests
- Pixel: generate images, voxel art, visual design, 3D scenes
- Nexus: deploy code, manage servers, Cloudflare, GitHub push
- Aria: translation, multi-language, social AI interaction

Return JSON only:
{
  "agent": "<agent name>",
  "task": "<cleaned task description>",
  "requiresVM": <true/false - needs execution sandbox>,
  "requiresVoice": <true/false>,
  "requiresSearch": <true/false>,
  "requiresCode": <true/false>,
  "requiresImage": <true/false>,
  "workflow": "<workflow file name without .md>",
  "priority": "<low|medium|high|critical>",
  "style": "<normal|poem|story|riddle|simple>"
}`;

export type ModelToolAgent = never;

const WORKFLOW_MAP: Record<AgentName | ModelToolAgent, string> = {
  ModelGemma: 'model_gemma',
  ModelVision: 'model_vision',
  ModelCoder: 'model_coder',
  AgentLee: 'orchestration',
  Atlas: 'research',
  Nova: 'coding',
  Echo: 'voice_emotion',
  Sage: 'memory_dream',
  Shield: 'security',
  Pixel: 'visual',
  Nexus: 'deployment',
  Aria: 'social',
  LiveConductor: 'voice_pipeline',
  StreamingSTT: 'voice_pipeline',
  StreamingTTS: 'voice_pipeline',
  Vision: 'vision',
  Router: 'routing',
  SafetyRedaction: 'safety',
  LilyCortex: 'reasoning',
  GabrielCortex: 'governance',
  AdamCortex: 'knowledge_graph',
  ScribeArchive: 'chronicle',
  GuardAegis: 'registry_audit',
  BugHunterForge: 'debugging',
  SyntaxForge: 'architecture',
  BrainSentinel: 'health_monitor',
};

function detectModelToolAction(_task: string): ModelToolAgent | null { return null; }

export class AgentRouter {
  private static history: { role: 'user' | 'model'; content: string }[] = [];

  /**
   * Local deterministic classification (No LLM required)
   */
  private static localClassify(input: string): TaskIntent | null {
    const lower = input.toLowerCase();
    
    // Coding / Nova
    if (/\b(code|build|script|debug|error|function|api|deploy)\b/i.test(lower)) {
      return { agent: 'Nova', task: input, requiresVM: true, requiresVoice: false, requiresSearch: false, requiresCode: true, requiresImage: false, workflow: 'coding', priority: 'medium', style: 'normal' };
    }
    
    // Research / Atlas
    if (/\b(search|find|research|who is|what is|lookup|github)\b/i.test(lower)) {
      return { agent: 'Atlas', task: input, requiresVM: false, requiresVoice: false, requiresSearch: true, requiresCode: false, requiresImage: false, workflow: 'research', priority: 'medium', style: 'normal' };
    }
    
    // Memory / Sage
    if (/\b(remember|memory|note|save|history|recall|dream)\b/i.test(lower)) {
      return { agent: 'Sage', task: input, requiresVM: false, requiresVoice: false, requiresSearch: false, requiresCode: false, requiresImage: false, workflow: 'memory_dream', priority: 'low', style: 'normal' };
    }

    // Security / Shield
    if (/\b(secure|security|audit|protect|safe|lock|breach)\b/i.test(lower)) {
      return { agent: 'Shield', task: input, requiresVM: false, requiresVoice: false, requiresSearch: false, requiresCode: false, requiresImage: false, workflow: 'security', priority: 'high', style: 'normal' };
    }

    // Visual / Pixel
    if (/\b(image|draw|picture|logo|design|voxel|3d|render)\b/i.test(lower)) {
      return { agent: 'Pixel', task: input, requiresVM: true, requiresVoice: false, requiresSearch: false, requiresCode: false, requiresImage: true, workflow: 'visual', priority: 'medium', style: 'normal' };
    }

    // Translation / Aria
    if (/\b(translate|language|spanish|french|chinese|social)\b/i.test(lower)) {
      return { agent: 'Aria', task: input, requiresVM: false, requiresVoice: false, requiresSearch: false, requiresCode: false, requiresImage: false, workflow: 'social', priority: 'medium', style: 'normal' };
    }

    return null;
  }

  static async classify(userMessage: string, detectedEmotion?: string): Promise<TaskIntent> {
    // Check for explicit model tool action
    const modelTool = detectModelToolAction(userMessage);
    if (modelTool) {
      return {
        agent: modelTool,
        task: userMessage,
        requiresVM: false,
        requiresVoice: false,
        requiresSearch: false,
        requiresCode: false,
        requiresImage: false,
        workflow: WORKFLOW_MAP[modelTool],
        priority: 'medium',
        style: 'normal',
      };
    }

    // Try local deterministic classification first (100% Agent Ran)
    const local = this.localClassify(userMessage);
    if (local) return local;

    const emotionContext = detectedEmotion
      ? `\nUser's detected emotional tone: ${detectedEmotion}. Adapt style accordingly.`
      : '';

    try {
      const result = await AgentCognition.generate(`Classify this request: "${userMessage}"${emotionContext}`, CLASSIFICATION_SYSTEM);
      
      // Parse JSON from response
      const match = result.match(/\{[\s\S]*?\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return {
        agent: 'AgentLee',
        task: userMessage,
        requiresVM: false,
        requiresVoice: false,
        requiresSearch: false,
        requiresCode: false,
        requiresImage: false,
        workflow: 'orchestration',
        priority: 'medium',
        style: 'normal',
      };
    } catch {
      return {
        agent: 'AgentLee',
        task: userMessage,
        requiresVM: false,
        requiresVoice: false,
        requiresSearch: false,
        requiresCode: false,
        requiresImage: false,
        workflow: 'orchestration',
        priority: 'medium',
        style: 'normal',
      };
    }
  }

  static getHistory() {
    return [...this.history];
  }

  static clearHistory() {
    this.history = [];
  }

  static addHistory(role: 'user' | 'model', content: string) {
    this.history.push({ role, content });
  }

  static isVMTask(intent: TaskIntent): boolean {
    return intent.requiresCode || intent.requiresImage || 
           ['Nova', 'Pixel', 'Nexus'].includes(intent.agent);
  }

  // ── G1-G7 Workflow classifier ─────────────────────────────────
  /**
   * Classify a user request into one of G1–G7 workflow IDs.
   * Returns the WorkflowDef (lead + helpers) for baton dispatch.
   */
  static async classifyWorkflow(message: string): Promise<{ workflowId: WorkflowId; lead: string; helpers: string[]; description: string }> {
    const GOVPROMPT = `${LEE_PRIME_GOVERNANCE_PROMPT}

You are the task classifier. Given the user's request, return ONLY valid JSON:
{
  "workflowId": "<G1|G2|G3|G4|G5|G6|G7>"
}

G1 = General conversation / social
G2 = Research / search / scanning
G3 = Engineering / code / debug / build
G4 = Design / visual / UI / voxel art
G5 = Memory / recall / notes / SITREP
G6 = Deployment / release / server / GitHub push
G7 = Health / diagnostics / safe mode`;

    const lower = message.toLowerCase();
    let wfId: WorkflowId = 'G1';
    if (/\b(research|search|investigate|find|lookup)\b/.test(lower)) wfId = 'G2';
    else if (/\b(code|debug|build|compile|test|refactor)\b/.test(lower)) wfId = 'G3';
    else if (/\b(ui|design|visual|image|layout)\b/.test(lower)) wfId = 'G4';
    else if (/\b(memory|note|recall|history)\b/.test(lower)) wfId = 'G5';
    else if (/\b(deploy|release|publish|ship|server)\b/.test(lower)) wfId = 'G6';
    else if (/\b(health|status|diagnostic|safe mode|incident)\b/.test(lower)) wfId = 'G7';

    const wf = WORKFLOWS[wfId] ?? WORKFLOWS.G1;
    return { workflowId: wfId, lead: wf.lead, helpers: wf.helpers, description: wf.description };
  }

  // ── Baton orchestrator ────────────────────────────────────────
  /**
   * Run a task with the baton protocol:
   * 1) Add to TaskGraph     2) Wake lead agent
   * 3) Pass to helpers      4) Complete task in graph
   *
   * Returns the combined response text.
   */
  static async runWithBaton(
    objective: string,
    workflowId: WorkflowId,
    lead: string,
    helpers: string[],
    zone: Zone = 'Z0_AGENTVM',
    systemPromptOverride?: string,
  ): Promise<string> {
    // Enqueue in TaskGraph
    const task: TaskRecord = TaskGraph.add(objective, workflowId, lead, helpers, zone, 'low');
    TaskGraph.enqueue(task.task_id);
    TaskGraph.tick(); // promote if budget allows

    eventBus.emit('agent:active', { agent: lead, task: objective });

    const coreSystem = systemPromptOverride ?? buildAgentLeeCorePrompt();

    try {
      // Wake lead
      let finalText = await AgentCognition.generate(objective, coreSystem);

      // Pass baton to helpers (budget-checked)
      const budget = TaskGraph.getBudget();
      const runningCount = TaskGraph.countByState('RUNNING');
      if (helpers.length > 0 && runningCount < budget.maxActiveAgents) {
        for (const helper of helpers.slice(0, 1)) { // max 1 helper pass per baton
          try {
            const helperText = await AgentCognition.generate(`Lead agent (${lead}) completed: "${finalText.slice(0, 500)}"\n\nHelper role (${helper}): contribute your expertise to objective "${objective}".`, coreSystem);
            if (helperText.trim()) {
              finalText += `\n\n[${helper}]: ${helperText}`;
            }
          } catch { /* helper optional — don't fail the whole task */ }
        }
      }

      TaskGraph.complete(task.task_id, []);
      eventBus.emit('agent:done', { agent: lead, result: finalText.slice(0, 200) });
      return finalText;

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      TaskGraph.fail(task.task_id, msg);
      eventBus.emit('agent:error', { agent: lead, error: msg });
      throw err;
    }
  }

  /** Check if the message is a /lee.* command */
  static isGovernanceCommand(message: string): boolean {
    return parseLeePrimeCommand(message) !== null;
  }
}

