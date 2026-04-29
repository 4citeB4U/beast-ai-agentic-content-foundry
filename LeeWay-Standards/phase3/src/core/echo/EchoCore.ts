import { CollaborationReceipt, MemoryEntry, ValidationResult } from "@/types/runtime";

const memoryStore: MemoryEntry[] = [];
const receiptLog: CollaborationReceipt[] = [];
const invertedIndex = new Map<string, Set<string>>();
const clusterIndex = new Map<string, Set<string>>();

function nextId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `echo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeToken(token: string): string {
  return token.toLowerCase().replace(/[^a-z0-9'-]/g, "").trim();
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token.length >= 3),
    ),
  );
}

function deriveTags(input: string, output: string): string[] {
  const text = `${input} ${output}`.toLowerCase();
  const tags: string[] = [];
  const ruleMap: Array<[string, RegExp]> = [
    ["debug", /\b(debug|error|fix|broken|issue)\b/],
    ["certification", /\b(cert|certification|aws|azure|cloud)\b/],
    ["planning", /\b(plan|roadmap|steps|sequence)\b/],
    ["memory", /\b(remember|recall|previous|before)\b/],
    ["vision", /\b(camera|vision|object|frame|see)\b/],
  ];
  for (const [tag, pattern] of ruleMap) {
    if (pattern.test(text)) tags.push(tag);
  }
  return tags;
}

function deriveClusterKey(tokens: string[]): string {
  if (!tokens.length) return "cluster:general";
  const head = tokens.slice(0, 4).sort().join("|");
  return `cluster:${head}`;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  const intersection = new Set([...a].filter((item) => b.has(item))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function indexEntry(entry: MemoryEntry): void {
  for (const token of entry.tokens) {
    if (!invertedIndex.has(token)) invertedIndex.set(token, new Set());
    invertedIndex.get(token)!.add(entry.id);
  }

  if (!clusterIndex.has(entry.clusterKey)) clusterIndex.set(entry.clusterKey, new Set());
  clusterIndex.get(entry.clusterKey)!.add(entry.id);
}

function lookupByIds(ids: Iterable<string>): MemoryEntry[] {
  const idSet = new Set(ids);
  return memoryStore.filter((entry) => idSet.has(entry.id));
}

export async function echoRead(query: string): Promise<MemoryEntry[]> {
  const tokens = tokenize(query);
  const candidateIds = new Set<string>();

  for (const token of tokens) {
    const ids = invertedIndex.get(token);
    if (!ids) continue;
    ids.forEach((id) => candidateIds.add(id));
  }

  const candidates = lookupByIds(candidateIds.size ? candidateIds : memoryStore.map((entry) => entry.id));
  const querySet = new Set(tokens);

  return candidates
    .map((entry) => ({
      entry,
      similarity: jaccard(querySet, new Set(entry.tokens)),
    }))
    .sort((a, b) => b.similarity - a.similarity || b.entry.timestamp - a.entry.timestamp)
    .slice(0, 5)
    .map((item) => item.entry);
}

export async function echoWrite(entry: {
  input: string;
  output: string;
  validation: ValidationResult;
}): Promise<MemoryEntry> {
  const tokens = tokenize(`${entry.input} ${entry.output}`);
  const stored: MemoryEntry = {
    id: nextId(),
    input: entry.input,
    output: entry.output,
    validation: entry.validation,
    tags: deriveTags(entry.input, entry.output),
    tokens,
    clusterKey: deriveClusterKey(tokens),
    timestamp: Date.now(),
  };

  memoryStore.push(stored);
  indexEntry(stored);
  return stored;
}

export function writeReceipt(receipt: Omit<CollaborationReceipt, "id" | "timestamp">): CollaborationReceipt {
  const stored: CollaborationReceipt = {
    ...receipt,
    id: nextId(),
    timestamp: Date.now(),
  };
  receiptLog.push(stored);
  return stored;
}

export function getRecentReceipts(limit = 20): CollaborationReceipt[] {
  return receiptLog.slice(-limit);
}

export function getMemoryClusters(): Array<{ clusterKey: string; count: number }> {
  return Array.from(clusterIndex.entries())
    .map(([clusterKey, ids]) => ({ clusterKey, count: ids.size }))
    .sort((a, b) => b.count - a.count);
}

export function getMemorySnapshot() {
  return {
    totalEntries: memoryStore.length,
    totalClusters: clusterIndex.size,
    recentEntries: memoryStore.slice(-10),
    clusters: getMemoryClusters(),
  };
}
