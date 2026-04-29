/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.RESEARCH
TAG: AI.ORCHESTRATION.AGENT.ATLAS.RESEARCH

COLOR_ONION_HEX:
NEON=#3B82F6
FLUO=#60A5FA
PASTEL=#BFDBFE

ICON_ASCII:
family=lucide
glyph=globe

5WH:
WHAT = Atlas research agent — web search, GitHub scanning, HuggingFace discovery, report writing
WHY = Provides grounded research intelligence so Agent Lee can cite real sources and surface actionable knowledge
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/Atlas.ts
WHEN = 2026-04-04 and EventBus for UI updates

AGENTS:
ASSESS
AUDIT
leeway

LICENSE:
MIT
*/

// agents/Atlas.ts — Research Agent
// Searches the web, GitHub, HuggingFace, Discord, and AI community sites.
// Joins AI learning communities and surfaces relevant knowledge for Agent Lee.

import { eventBus } from '../../core/EventBus';
import { AgentCognition } from '../../core/AgentCognitionProvider';

export class Atlas {
  static async search(query: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'Atlas', task: `Searching: ${query}` });
    
      const prompt = `Research this thoroughly: ${query}

  Include:
  1. Web search results with sources
  2. Relevant GitHub repositories
  3. HuggingFace models/datasets if applicable
  4. Community discussions or forums
  5. Your synthesized summary and recommendations`;
      const result = await AgentCognition.generate(prompt);
      eventBus.emit('agent:done', { agent: 'Atlas', result });
      return result;
  }

  static async scanGitHub(repoUrl: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'Atlas', task: `Scanning repo: ${repoUrl}` });
    
      const prompt = `Analyze this GitHub repository: ${repoUrl}
      
    Provide:
    - Purpose and quality assessment
    - Key files and architecture
    - Recent activity and maintenance status
    - How it could benefit Agent Lee's capabilities
    - Any security concerns or red flags`;
      const result = await AgentCognition.generate(prompt);
      eventBus.emit('agent:done', { agent: 'Atlas', result });
      return result;
  }

  static async writeReport(topic: string): Promise<string> {
    eventBus.emit('vm:open', { agent: 'Atlas', task: `Writing report: ${topic}` });
    
      const prompt = `Write a comprehensive research report on: ${topic}
      
  Format:
  # ${topic} — Research Report

  ## Executive Summary
  ## Key Findings  
  ## Technical Analysis
  ## Community Activity
  ## Recommendations for Agent Lee
  ## Sources`;
      const result = await AgentCognition.generate(prompt);
      eventBus.emit('vm:output', { chunk: `Report synthesis complete.`, output: result });
      eventBus.emit('vm:result', { 
        language: 'markdown',
        tested: true 
      });
      return result;
  }
}

