/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.ECONOMIC
TAG: ENGINE.ECONOMIC
WHAT = Economic engine for usage accounting and resource cost control
WHY = Tracks worker jobs, runtime cost, and usage ledger
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


const usageLedger = [];
const quotaStates = new Map();

export const EconomicEngine = {
  recordUsage(entry) {
    const payload = { ...entry, id: `usage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, timestamp: new Date().toISOString() };
    usageLedger.unshift(payload);
    return payload;
  },

  estimateCost(task) {
    const baseCost = task?.cost || 1;
    const multiplier = task?.complexity === 'high' ? 3 : task?.complexity === 'medium' ? 2 : 1;
    return baseCost * multiplier;
  },

  getLedger() {
    return [...usageLedger];
  },

  setQuota(key, value) {
    quotaStates.set(key, value);
    return { key, value };
  },

  getQuota(key) {
    return quotaStates.get(key) ?? null;
  },

  enforceQuota(key, amount) {
    const quota = quotaStates.get(key);
    if (quota == null) {
      return { allowed: true, remaining: null };
    }
    const used = usageLedger.filter(entry => entry.key === key).reduce((sum, entry) => sum + (entry.amount || 0), 0);
    const remaining = quota - used;
    return { allowed: remaining >= amount, remaining };
  },
};
