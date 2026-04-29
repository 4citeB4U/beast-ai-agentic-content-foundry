import { NegotiationResult, OriginDecision } from "@/types/runtime";

export function negotiateCoreRoute(args: {
  origin: OriginDecision;
  input: string;
  memoryCount: number;
  ragPreviewCount: number;
}): NegotiationResult {
  const { origin, input, memoryCount, ragPreviewCount } = args;
  const reasons: string[] = [];
  const route: NegotiationResult["route"] = ["ORIGIN_CORE"];

  let requiresRag = false;
  let requiresMemoryRecall = false;
  let requiresClarification = Boolean(origin.needsClarification);
  let clarificationQuestion: string | undefined;
  let finalIntent = origin.primaryIntent;

  const lower = input.toLowerCase();

  if (origin.primaryIntent === "CERT_ADVICE" || /lesson|curriculum|course|study/i.test(lower)) {
    requiresRag = true;
    reasons.push("Curriculum-oriented request requires grounded retrieval.");
  }

  if (origin.primaryIntent === "MEMORY_RECALL" || /before|last time|remember/i.test(lower)) {
    requiresMemoryRecall = true;
    reasons.push("Memory-oriented request requires Echo recall.");
  }

  if (origin.ambiguous && origin.confidence < 0.6) {
    requiresClarification = true;
    clarificationQuestion = "I see more than one likely meaning. Should I focus on planning, debugging, or certification guidance?";
    reasons.push("Ambiguity threshold exceeded; clarification preferred.");
  }

  if (requiresMemoryRecall) route.push("ECHO_CORE");
  if (requiresRag) route.push("VECTOR_CORE");
  route.push("STRUCTURE_CORE");

  if (requiresClarification && memoryCount > 0 && origin.primaryIntent !== "UNKNOWN") {
    requiresClarification = false;
    reasons.push("Recent memory reduced ambiguity enough to continue without clarification.");
  }

  if (requiresRag && ragPreviewCount === 0) {
    reasons.push("RAG requested, but no preview context is available yet; continue with cautious planning.");
  }

  return {
    finalIntent,
    route,
    requiresRag,
    requiresMemoryRecall,
    requiresClarification,
    clarificationQuestion,
    reasons,
  };
}
