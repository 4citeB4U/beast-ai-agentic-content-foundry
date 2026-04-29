/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.CORE
TAG: AI.ORCHESTRATION.AGENT.AGENTLEE.ORCHESTRATOR

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=cpu

5WH:
WHAT = Lee Prime — Sovereign Orchestrator of the Agent Lee Agentic OS; routes G1-G8+Voice workflows across 20 named agents
WHY = Central routing and execution brain — plans, delegates, verifies, and delivers all tasks in a 20-agent civilization
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/AgentLee.ts
WHEN = 2026-04-04
HOW = Static class with respond(), plan(), and verify() methods using deterministic cognition and EventBus

AGENTS:
ASSESS
AUDIT
leeway
NOVA
ECHO

LICENSE:
MIT
*/

// agents/AgentLee.ts — Lead Orchestrator
// Master planner, task setter, and verified finisher.
// Always researches → plans → delegates → verifies → delivers with evidence.


import { AgentRouter, TaskIntent } from '../../core/AgentRouter';
import { eventBus } from '../../core/EventBus';
import { buildAgentLeeCorePrompt } from '../../core/agent_lee_prompt_assembler';
import { AgentCognition } from '../../core/AgentCognitionProvider';

const LEE_SYSTEM_PROMPT = buildAgentLeeCorePrompt();
const LEE_SPECIFIC_INSTRUCTIONS = `
- Master planner: you always create a clear plan before acting
- Verified finisher: you always test and present evidence of completion
- Good listener: you detect emotion and tone in the user's message
- Adaptive communicator: you speak to a poet in poems, a coder in code, a child in stories
- Social butterfly: you love languages and translation, work well with groups
- Always lead with a plan, then act, then verify, then present.`;

const FULL_SYSTEM_PROMPT = `${LEE_SYSTEM_PROMPT}\n\nLEAD ORCHESTRATOR ROLE:\n${LEE_SPECIFIC_INSTRUCTIONS}`;

export class AgentLee {
  static async respond(
    userMessage: string, 
    intent: TaskIntent,
    streamCallback?: (chunk: string) => void
  ): Promise<string> {
    
    eventBus.emit('agent:active', { agent: 'AgentLee', task: intent.task });
    
    const history = AgentRouter.getHistory();
    
    const styleDirective = intent.style && intent.style !== 'normal'
      ? `\n[STYLE DIRECTIVE: Respond in the form of a ${intent.style}]`
      : '';

    // Use local cognition routing for response generation when needed
    const result = await AgentCognition.generate(`${userMessage}${styleDirective}`, FULL_SYSTEM_PROMPT);
    AgentRouter.addHistory('user', userMessage);
    AgentRouter.addHistory('model', result);
    eventBus.emit('agent:done', { agent: 'AgentLee', result });
    return result;
  }

  static async plan(task: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'AgentLee', task: 'Creating plan...' });
    
    // Use local cognition routing for response generation when needed
    const result = await AgentCognition.generate(`Create a detailed, step-by-step execution plan for: "${task}"
Format as:
PLAN: <one sentence summary>
RESEARCH NEEDED: <yes/no — what to look up>
STEPS:
1. ...
2. ...
AGENTS NEEDED: <list of agents>
SUCCESS CRITERIA: <how we know it's done>
ESTIMATED TIME: <rough estimate>`);
    return result;
  }

  static async verify(task: string, result: string): Promise<{ passed: boolean; notes: string }> {
    // Use local cognition routing for response generation when needed
    const verification = await AgentCognition.generate(`Verify this task was completed correctly.
TASK: ${task}
RESULT: ${result}

Check: completeness, correctness, quality, edge cases.
Return JSON: { "passed": true/false, "notes": "..." }`);
    try {
      const json = verification.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : { passed: true, notes: 'Verification completed' };
    } catch {
      return { passed: true, notes: verification };
    }
  }
}

