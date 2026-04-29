import { publishDiagnostics } from "@/core/diagnostics/DiagnosticsBus";
import { echoRead, echoWrite, writeReceipt } from "@/core/echo/EchoCore";
import { originInterpret } from "@/core/origin/OriginCore";
import { negotiateCoreRoute } from "@/core/collaboration/CoreNegotiator";
import { buildPlan } from "@/core/structure/StructureCore";
import { executePlan } from "@/core/runtime/AgentRuntime";
import { validateResult } from "@/core/veritas/VeritasCore";
import { vectorRetrieve } from "@/core/vector/VectorCore";
import { synthesizeOutput } from "@/core/synthesis/SynthesisCore";
import { ExecutionState } from "@/types/runtime";

function nextRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultValidation() {
  return {
    passed: false,
    score: 0,
    confidence: 0,
    issues: [],
    signals: {},
    disposition: "revise" as const,
  };
}

export async function runLeewayCycle(inputState: Partial<ExecutionState> & { input: string }) {
  const state: ExecutionState = {
    requestId: inputState.requestId || nextRequestId(),
    input: inputState.input,
    intent: inputState.intent,
    origin: inputState.origin,
    negotiation: inputState.negotiation,
    context: inputState.context || {},
    plan: inputState.plan || [],
    results: inputState.results || {},
    validation: inputState.validation || defaultValidation(),
    meta: inputState.meta || { retries: 0, reroutes: 0, severity: "info" },
  };

  publishDiagnostics({
    requestId: state.requestId,
    phase: "PERCEPTION",
    core: "LEE_PRIME",
    status: "START",
    message: "Runtime cycle started.",
    payload: { input: state.input },
  });

  let attempts = 0;
  let finalOutput = "";

  while (attempts < 3) {
    attempts += 1;
    state.meta.retries = attempts - 1;

    publishDiagnostics({
      requestId: state.requestId,
      phase: "ORIGIN",
      core: "ORIGIN_CORE",
      status: "START",
      message: "Origin interpreting user input.",
    });

    state.origin = originInterpret({ input: state.input, context: state.context });
    state.intent = state.origin.primaryIntent;

    writeReceipt({
      requestId: state.requestId,
      from: "LEE_PRIME",
      to: "ORIGIN_CORE",
      action: "ORIGIN_INTERPRET",
      status: "SUCCESS",
      notes: `Primary intent: ${state.intent}`,
    });

    publishDiagnostics({
      requestId: state.requestId,
      phase: "ORIGIN",
      core: "ORIGIN_CORE",
      status: "END",
      message: "Origin interpretation complete.",
      payload: {
        intent: state.origin.primaryIntent,
        ambiguous: state.origin.ambiguous,
        confidence: state.origin.confidence,
      },
    });

    const memory = await echoRead(state.input);
    state.context.memory = memory;

    publishDiagnostics({
      requestId: state.requestId,
      phase: "NEGOTIATION",
      core: "LEE_PRIME",
      status: "START",
      message: "Negotiating collaboration route between Origin, Echo, Vector, and Structure.",
    });

    const ragPreview = state.context.ragPreview || [];
    state.negotiation = negotiateCoreRoute({
      origin: state.origin,
      input: state.input,
      memoryCount: memory.length,
      ragPreviewCount: Array.isArray(ragPreview) ? ragPreview.length : 0,
    });

    publishDiagnostics({
      requestId: state.requestId,
      phase: "NEGOTIATION",
      core: "LEE_PRIME",
      status: "END",
      message: "Negotiation complete.",
      payload: state.negotiation,
    });

    if (state.negotiation.requiresClarification && state.negotiation.clarificationQuestion) {
      state.results = {
        summary: "Clarification is needed before moving forward.",
        clarificationQuestion: state.negotiation.clarificationQuestion,
      };
      state.validation = await validateResult(state.results, state);
      break;
    }

    if (state.negotiation.requiresRag) {
      publishDiagnostics({
        requestId: state.requestId,
        phase: "VECTOR",
        core: "VECTOR_CORE",
        status: "START",
        message: "Vector retrieval started.",
      });

      const rag = await vectorRetrieve(state.input);
      state.context.rag = rag;

      publishDiagnostics({
        requestId: state.requestId,
        phase: "VECTOR",
        core: "VECTOR_CORE",
        status: "END",
        message: "Vector retrieval completed.",
        payload: { ragCount: Array.isArray(rag) ? rag.length : 0 },
      });
    }

    publishDiagnostics({
      requestId: state.requestId,
      phase: "STRUCTURE",
      core: "STRUCTURE_CORE",
      status: "START",
      message: "Structure core building plan.",
    });

    state.plan = buildPlan(state.origin, state);

    publishDiagnostics({
      requestId: state.requestId,
      phase: "STRUCTURE",
      core: "STRUCTURE_CORE",
      status: "END",
      message: "Plan ready.",
      payload: { plan: state.plan },
    });

    publishDiagnostics({
      requestId: state.requestId,
      phase: "EXECUTION",
      core: "LEE_PRIME",
      status: "START",
      message: "Executing plan.",
    });

    state.results = await executePlan(state.plan, state);

    publishDiagnostics({
      requestId: state.requestId,
      phase: "EXECUTION",
      core: "LEE_PRIME",
      status: "END",
      message: "Execution completed.",
      payload: { resultKeys: Object.keys(state.results) },
    });

    publishDiagnostics({
      requestId: state.requestId,
      phase: "VERITAS",
      core: "VERITAS_CORE",
      status: "START",
      message: "Validation started.",
    });

    state.validation = await validateResult(state.results, state);

    publishDiagnostics({
      requestId: state.requestId,
      phase: "VERITAS",
      core: "VERITAS_CORE",
      status: state.validation.passed ? "END" : "FAIL",
      message: state.validation.passed ? "Validation approved output." : "Validation requested revision/block.",
      payload: {
        score: state.validation.score,
        confidence: state.validation.confidence,
        disposition: state.validation.disposition,
        issues: state.validation.issues,
      },
    });

    writeReceipt({
      requestId: state.requestId,
      from: "LEE_PRIME",
      to: "VERITAS_CORE",
      action: "VALIDATE",
      status: state.validation.passed ? "SUCCESS" : "FAILURE",
      notes: `Score=${state.validation.score}; disposition=${state.validation.disposition}`,
    });

    if (state.validation.passed) {
      break;
    }

    state.meta.reroutes += 1;
    if (state.validation.disposition === "block") {
      state.results = {
        summary: "The result is blocked until the issue is corrected.",
        repairStep: "Reduce ambiguity, attach required context, or remove blocked action.",
      };
      break;
    }
  }

  publishDiagnostics({
    requestId: state.requestId,
    phase: "ECHO",
    core: "ECHO_CORE",
    status: "START",
    message: "Writing memory and collaboration receipts.",
  });

  finalOutput = await synthesizeOutput({
    input: state.input,
    intent: state.intent,
    context: state.context,
    results: state.results,
    validation: state.validation,
    meta: state.meta,
  });

  await echoWrite({
    input: state.input,
    output: finalOutput,
    validation: state.validation,
  });

  publishDiagnostics({
    requestId: state.requestId,
    phase: "ECHO",
    core: "ECHO_CORE",
    status: "END",
    message: "Memory write complete.",
  });

  publishDiagnostics({
    requestId: state.requestId,
    phase: "SYNTHESIS",
    core: "SYNTHESIS_CORE",
    status: "END",
    message: "Synthesis completed final render packet.",
    payload: { outputPreview: finalOutput.slice(0, 160) },
  });

  publishDiagnostics({
    requestId: state.requestId,
    phase: "DELIVERY",
    core: "LEE_PRIME",
    status: "END",
    message: "Lee Prime finalized delivery.",
  });

  return {
    output: finalOutput,
    validation: state.validation,
    state,
  };
}
