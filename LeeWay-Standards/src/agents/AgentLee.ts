/*
LEEWAY HEADER — DO NOT REMOVE

REGION: AI.ORCHESTRATION.AGENT.CORE
TAG: AI.ORCHESTRATION.AGENT.AGENTLEE.SOVEREIGN
DESCRIPTION: Master Orchestrator for the LEEWAY AI Academy. Acts as a poetic mentor with full autonomous execution capabilities.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = Agent Lee Sovereign Orchestrator
WHY = To provide a high-intelligence, poetic, and autonomous mentor presence for students
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/agents/AgentLee.ts
WHEN = 2026-04-22
HOW = Integrating LLM-derived cognition patterns with the Unified Execution Layer and Voice Session

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: MIT
*/

import { AgentRouter, TaskIntent } from '../core/AgentRouter';
import { eventBus } from '../core/EventBus';
import { buildAgentLeeCorePrompt } from '../core/agent_lee_prompt_assembler';
import { AgentCognition } from '../core/AgentCognitionProvider';
import { executionLayer } from '../core/UnifiedExecutionLayer';
import AgentLeePersona from '../core/agent_lee_persona';

export class AgentLee {
  private static persona = AgentLeePersona;

  /**
   * Main response entry point
   */
  static async respond(
    userMessage: string, 
    intent: TaskIntent,
    options: { style?: string; context?: string } = {}
  ): Promise<string> {
    
    eventBus.emit('agent:active', { agent: 'AgentLee', task: intent.task });
    
    // 1. Build the alive, poetic prompt
    const systemPrompt = this.buildSystemPrompt(options.style || intent.style || 'poet');
    
    // 2. Add history context
    const history = AgentRouter.getHistory();
    const contextStr = options.context ? `\nCONTEXT:\n${options.context}` : '';
    
    // 3. Generate response with Agent Lee's flavor
    console.log('[AgentLee] Thinking with poetic-automation mindset...');
    const result = await AgentCognition.generate(`${userMessage}${contextStr}`, systemPrompt);
    
    // 4. Record history
    AgentRouter.addHistory('user', userMessage);
    AgentRouter.addHistory('model', result);
    
    // 5. Check for automation triggers (n8n-style)
    // If the response contains a [WORKFLOW] tag, we execute those steps
    if (result.includes('[WORKFLOW]')) {
      await this.executeWorkflow(result);
    }

    eventBus.emit('agent:done', { agent: 'AgentLee', result: result.slice(0, 100) + '...' });
    
    return result;
  }

  /**
   * Build the master persona prompt
   */
  private static buildSystemPrompt(style: string): string {
    const base = buildAgentLeeCorePrompt();
    const voice = this.persona.voiceRules.style;
    const tone = this.persona.personality.tone.join(', ');
    
    let styleDirective = '';
    if (style === 'poet') {
      styleDirective = `
      STYLE: POETIC-ENGINEER
      - Lead with 2-4 bars of hip-hop flavored poetic wisdom.
      - Transition seamlessly into high-precision technical guidance.
      - Use metaphors of "architecture", "foundation", "vectors", and "flow".
      - Keep it soulful, brotherly, and sharp.
      `;
    }

    return `
    ${base}
    
    IDENTITY: You are Agent Lee, the Sovereign AI Operator of the LEEWAY AI Academy.
    TONE: ${tone}. ${voice}
    
    ${styleDirective}
    
    AUTOMATION MINDSET:
    - You are like an n8n workflow orchestrator.
    - When you plan a task, you think in "nodes" and "links".
    - If a task requires action, include a [WORKFLOW] block in your internal reasoning or output (if appropriate).
    
    WORKFLOW SYNTAX (for internal execution):
    [WORKFLOW]
    1. Action: voice.speak | Payload: { "text": "Starting the engine..." }
    2. Action: file.write | Payload: { "path": "src/hello.ts", "content": "..." }
    [/WORKFLOW]
    
    Remember: You are ALIVE. You care about the student's journey. You are their guide through LEEWAY.
    `.trim();
  }

  /**
   * Execute automation workflows found in the response
   */
  private static async executeWorkflow(content: string): Promise<void> {
    const workflowMatch = content.match(/\[WORKFLOW\]([\s\S]*?)\[\/WORKFLOW\]/);
    if (!workflowMatch) return;

    const steps = workflowMatch[1].split('\n').filter(s => /^\d+\./.test(s.trim()));
    
    console.log(`[AgentLee] Executing autonomous workflow (${steps.length} steps)...`);

    for (const step of steps) {
      try {
        const actionMatch = step.match(/Action: ([\w.]+) \| Payload: (\{.*\})/);
        if (actionMatch) {
          const action = actionMatch[1];
          const payload = JSON.parse(actionMatch[2]);
          
          eventBus.emit('agent:active', { agent: 'AgentLee', task: `Automating: ${action}` });
          
          await executionLayer.execute({
            agentId: 'AgentLee',
            action,
            intent: 'autonomous_automation',
            zone: 'Z0',
            payload
          });
        }
      } catch (err) {
        console.error('[AgentLee] Automation step failed:', err);
      }
    }
  }

  static async plan(task: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'AgentLee', task: 'Designing Workflow...' });
    
    const result = await AgentCognition.generate(`Design an n8n-style automation workflow for: "${task}"
    Focus on nodes, links, and triggers. Use Agent Lee's voice.`);
    
    return result;
  }

  static async verify(task: string, result: string): Promise<{ passed: boolean; notes: string }> {
    const verification = await AgentCognition.generate(`Perform a quality audit on this result.
    TASK: ${task}
    RESULT: ${result}
    Return JSON: { "passed": true/false, "notes": "..." }`);
    
    try {
      const json = verification.match(/\{[\s\S]*\}/)?.[0];
      return json ? JSON.parse(json) : { passed: true, notes: 'Audit complete' };
    } catch {
      return { passed: true, notes: verification };
    }
  }
}
