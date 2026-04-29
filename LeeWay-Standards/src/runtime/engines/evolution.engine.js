/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.EVOLUTION
TAG: ENGINE.EVOLUTION
WHAT = Evolution engine for tracking performance and recommending improvements
WHY = Learns from task outcomes and improves worker and room selection
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


const outcomeHistory = [];

export const EvolutionEngine = {
  recordOutcome(outcome) {
    const entry = { ...outcome, id: `evo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, recordedAt: new Date().toISOString() };
    outcomeHistory.unshift(entry);
    return entry;
  },

  getTrendScore() {
    if (outcomeHistory.length === 0) return 0;
    const score = outcomeHistory.reduce((sum, item) => sum + (item.success ? 1 : -1), 0);
    return Math.max(-100, Math.min(100, Math.round((score / outcomeHistory.length) * 100)));
  },

  recommendRoute(context) {
    return { route: context?.preferred || 'default', score: this.getTrendScore() };
  },

  getHistory() {
    return [...outcomeHistory];
  },
};
