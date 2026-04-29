/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards
TAG: MCP.RTC.FEDERATION.ROUTER
REGION: 🟣 MCP
DISCOVERY_PIPELINE:
Voice → Intent → Location → Vertical → Ranking → Render
*/
// CHAIN: Standards → Integrated → Runtime → Projections


type Region = 'us-east' | 'us-west' | 'eu' | 'apac';

export interface SfuNode {
  id: string;
  region: Region;
  wsUrl: string;
  health: number; // 0–100
  rtt: number;    // ms
  load: number;   // 0–1
}

export class FederationRouter {
  private nodes: SfuNode[] = [];

  constructor(nodes: SfuNode[]) {
    this.nodes = nodes;
  }

  /** Score = latency + load penalty - health bonus */
  private score(n: SfuNode) {
    return n.rtt * 0.6 + n.load * 200 - n.health * 0.5;
  }

  selectBest(): SfuNode {
    return [...this.nodes].sort((a, b) => this.score(a) - this.score(b))[0];
  }

  async connectWithFailover(connectFn: (url: string) => Promise<void>) {
    const ordered = [...this.nodes].sort((a, b) => this.score(a) - this.score(b));
    for (const node of ordered) {
      try {
        await connectFn(node.wsUrl);
        return node;
      } catch {
        continue;
      }
    }
    throw new Error('All SFUs unavailable');
  }
}
