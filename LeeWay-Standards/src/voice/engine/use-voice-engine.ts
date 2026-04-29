/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.ENGINE
TAG: VOICE.ENGINE.HOOK
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
5WH:
  WHAT = useVoiceEngineWorkflow hook — React integration for Voice Matching Engine
  WHY  = Provides clean component interface to VoiceEngineController
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/use-voice-engine.ts
  WHEN = 2026
  HOW  = Wraps controller lifetime, emits state changes, exposes action methods
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  VoiceEngineController,
  getAgentInstruction,
} from './engine-controller';
import { VoiceEngineState, AgentInstruction, ModulationPreset } from './engine-types';

export function useVoiceEngineWorkflow() {
  const controller = useMemo(() => new VoiceEngineController(), []);
  const [state, setState] = useState<VoiceEngineState>(controller.getState());

  useEffect(() => {
    const unsubscribe = controller.subscribe(setState);
    return unsubscribe;
  }, [controller]);

  const actions = useMemo(
    () => ({
      boot: () => controller.boot(),
      startCapture: () => controller.startCapture(),
      stopCapture: () => controller.stopCapture(),
      analyze: () => controller.analyze(),
      buildProfile: (label?: string) => controller.buildProfile(label),
      matchVoices: () => controller.matchVoices(),
      selectVoice: (name: string) => controller.selectVoice(name),
      applyPreset: (preset: ModulationPreset) => controller.applyPreset(preset),
      preview: (text: string) => controller.preview(text),
      approvePreview: () => controller.approvePreview(),
      saveFinal: () => controller.saveFinal(),
      resetToCapture: () => controller.resetToCapture(),
    }),
    [controller]
  );

  const instruction: AgentInstruction = useMemo(() => getAgentInstruction(state), [state]);

  return { state, instruction, actions };
}
