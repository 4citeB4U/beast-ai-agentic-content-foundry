/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.ENGINE
TAG: VOICE.ENGINE.CONTROLLER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
5WH:
  WHAT = VoiceEngineController — state machine for Voice Matching + Modulation workflow
  WHY  = Manages strict step progression, audio capture, analysis, matching, modulation, save
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/engine-controller.ts
  WHEN = 2026
  HOW  = Redux-like state machine with guarded transitions, YIN pitch detection, 
         deterministic voice scoring, browser speech synthesis modulation
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import {
  VoicePhase,
  ToneFamily,
  Stability,
  SupportMatrix,
  VoiceCatalogItem,
  SampleMeta,
  VoiceAnalysis,
  VoiceProfile,
  MatchCandidate,
  MatchResult,
  ModulationConfig,
  PreviewResult,
  SavedConfig,
  VoiceEngineState,
  AgentInstruction,
  ModulationPreset,
} from './engine-types';

const VOICE_WORKFLOW: Record<VoicePhase, VoicePhase[]> = {
  idle: ['boot'],
  boot: ['capture', 'error'],
  capture: ['analyze', 'error'],
  analyze: ['profile', 'capture', 'error'],
  profile: ['match', 'error'],
  match: ['modulate', 'error'],
  modulate: ['preview', 'error'],
  preview: ['save', 'match', 'modulate', 'error'],
  save: ['ready', 'error'],
  ready: ['capture', 'preview', 'error'],
  error: ['boot', 'capture'],
};

const STORAGE_KEYS = {
  profileList: 'leeway_voice_profiles',
  activeConfig: 'leeway_voice_active_config',
} as const;

const DEFAULT_MODULATION_PRESETS: Record<ModulationPreset, ModulationConfig> = {
  Natural: {
    preset: 'Natural',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    lowShelfGain: 1,
    highShelfGain: 0,
    compressorRatio: 2,
  },
  Deep: {
    preset: 'Deep',
    rate: 0.95,
    pitch: 0.9,
    volume: 1.0,
    lowShelfGain: 3,
    highShelfGain: -1,
    compressorRatio: 3,
  },
  Bright: {
    preset: 'Bright',
    rate: 1.05,
    pitch: 1.1,
    volume: 1.0,
    lowShelfGain: -1,
    highShelfGain: 3,
    compressorRatio: 2.5,
  },
  Broadcast: {
    preset: 'Broadcast',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.05,
    lowShelfGain: 2,
    highShelfGain: 2,
    compressorRatio: 4,
  },
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function canTransition(from: VoicePhase, to: VoicePhase): boolean {
  return (VOICE_WORKFLOW[from] as readonly VoicePhase[]).includes(to);
}

function normalizeVoiceName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function createInitialState(): VoiceEngineState {
  return {
    phase: 'idle',
    support: null,
    voiceCatalog: [],
    savedProfiles: [],
    savedConfig: null,

    stream: null,
    audioContext: null,
    analyser: null,
    mediaStreamSource: null,

    sampleBuffer: null,
    sampleMeta: {
      startedAt: null,
      endedAt: null,
      durationMs: 0,
      signalDetected: false,
      streamActive: false,
    },

    analysis: null,
    profile: null,
    matchResult: null,
    modulation: null,
    previewResult: null,

    errors: [],
    nextAllowedPhase: 'boot',
  };
}

// ─── Audio Analysis ───────────────────────────────────────────────────────────

function detectPitchAutocorrelation(buffer: Float32Array, sampleRate: number): number {
  let bestOffset = -1;
  let bestCorrelation = 0;

  for (let offset = 8; offset < 1000; offset++) {
    let correlation = 0;
    for (let i = 0; i < buffer.length - offset; i++) {
      correlation += buffer[i] * buffer[i + offset];
    }
    correlation /= buffer.length - offset;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestOffset = offset;
    }
  }

  if (bestOffset === -1) return 0;
  return sampleRate / bestOffset;
}

function computeEnergy(buffer: Float32Array): { avg: number; peak: number } {
  let sum = 0;
  let peak = 0;

  for (let i = 0; i < buffer.length; i++) {
    const v = Math.abs(buffer[i]);
    sum += v;
    if (v > peak) peak = v;
  }

  return {
    avg: sum / buffer.length,
    peak,
  };
}

function classifyToneFamily(pitchHz: number): ToneFamily {
  if (pitchHz > 0 && pitchHz < 135) return 'deep';
  if (pitchHz >= 135 && pitchHz < 185) return 'balanced';
  return 'bright';
}

function estimateStability(buffer: Float32Array): Stability {
  if (!buffer.length) return 'unknown';

  let variance = 0;
  let mean = 0;
  for (let i = 0; i < buffer.length; i++) mean += buffer[i];
  mean /= buffer.length;

  for (let i = 0; i < buffer.length; i++) {
    const d = buffer[i] - mean;
    variance += d * d;
  }
  variance /= buffer.length;

  return variance < 0.02 ? 'stable' : 'variable';
}

function scoreSampleQuality(
  pitchHz: number,
  energyAvg: number,
  energyPeak: number,
  signalDetected: boolean
): number {
  let score = 0;

  if (signalDetected) score += 0.3;
  if (pitchHz > 70 && pitchHz < 320) score += 0.3;
  if (energyAvg > 0.01) score += 0.2;
  if (energyPeak > 0.05) score += 0.2;

  return Math.max(0, Math.min(1, score));
}

// ─── Voice Matching ───────────────────────────────────────────────────────────

function buildVoiceTags(name: string): string[] {
  const n = normalizeVoiceName(name);
  const tags: string[] = [];

  if (n.includes('guy')) tags.push('deep', 'male', 'steady');
  if (n.includes('eric')) tags.push('balanced', 'male');
  if (n.includes('davis')) tags.push('deep', 'male');
  if (n.includes('brian')) tags.push('deep', 'male');
  if (n.includes('ryan')) tags.push('deep', 'male');
  if (n.includes('aria')) tags.push('bright', 'female');
  if (n.includes('jenny')) tags.push('bright', 'female');
  if (n.includes('sara')) tags.push('balanced', 'female');
  if (n.includes('michelle')) tags.push('balanced', 'female');
  if (n.includes('microsoft')) tags.push('microsoft');
  if (n.includes('natural')) tags.push('neural');

  return tags;
}

function buildVoiceCatalog(voices: SpeechSynthesisVoice[]): VoiceCatalogItem[] {
  return voices.map((v) => ({
    name: v.name,
    lang: v.lang,
    localService: v.localService,
    default: v.default,
    normalizedName: normalizeVoiceName(v.name),
    tags: buildVoiceTags(v.name),
  }));
}

function scoreVoiceCandidate(profile: VoiceProfile, voice: VoiceCatalogItem): MatchCandidate {
  let score = 0;
  const reason: string[] = [];

  if (voice.lang.toLowerCase().startsWith('en')) {
    score += 0.2;
    reason.push('English voice');
  }

  if (profile.toneFamily === 'deep' && voice.tags.includes('deep')) {
    score += 0.3;
    reason.push('Tone family matches deep');
  } else if (profile.toneFamily === 'balanced' && voice.tags.includes('balanced')) {
    score += 0.3;
    reason.push('Tone family matches balanced');
  } else if (profile.toneFamily === 'bright' && voice.tags.includes('bright')) {
    score += 0.3;
    reason.push('Tone family matches bright');
  }

  if (profile.pitchHz < 140 && voice.tags.includes('male')) {
    score += 0.2;
    reason.push('Pitch range aligns with male voice');
  } else if (profile.pitchHz >= 140 && voice.tags.includes('female')) {
    score += 0.2;
    reason.push('Pitch range aligns with female voice');
  }

  if (voice.tags.includes('neural')) {
    score += 0.15;
    reason.push('Neural voice');
  }

  if (voice.localService) {
    score += 0.1;
    reason.push('Local service available');
  }

  return {
    name: voice.name,
    score: Math.min(1, score),
    reason,
  };
}

function rankVoices(profile: VoiceProfile, voiceCatalog: VoiceCatalogItem[]): MatchResult {
  const ranked = voiceCatalog
    .map((voice) => scoreVoiceCandidate(profile, voice))
    .sort((a, b) => b.score - a.score);

  const recommended = ranked[0] ?? null;
  const alternatives = ranked.slice(1, 4);

  return {
    recommended,
    alternatives,
    selectedVoiceName: recommended?.name ?? null,
  };
}

// ─── Agent Instructions ────────────────────────────────────────────────────────

export function getAgentInstruction(state: VoiceEngineState): AgentInstruction {
  switch (state.phase) {
    case 'boot':
      return {
        title: 'Booting voice engine',
        message: 'Checking microphone, browser audio, voice catalog, and saved profiles.',
        actionLabel: null,
        blockNext: true,
      };
    case 'capture':
      return {
        title: 'Capture a clean sample',
        message:
          'Press Start, then speak for 3–5 seconds. The engine needs a clear signal before analysis.',
        actionLabel: 'Start Capture',
        blockNext: true,
      };
    case 'analyze':
      return {
        title: 'Analyzing your voice',
        message: 'Measuring pitch, energy, tone family, and sample quality.',
        actionLabel: 'Run Analysis',
        blockNext: true,
      };
    case 'profile':
      return {
        title: 'Build your profile',
        message: 'Creating a reusable local profile from your measured voice traits.',
        actionLabel: 'Build Profile',
        blockNext: true,
      };
    case 'match':
      return {
        title: 'Match a browser voice',
        message: 'Ranking free browser voices and selecting the closest fit to your traits.',
        actionLabel: 'Find Match',
        blockNext: true,
      };
    case 'modulate':
      return {
        title: 'Shape your voice',
        message: 'Choose a preset (Natural, Deep, Bright, Broadcast) to modulate the voice.',
        actionLabel: 'Apply Preset',
        blockNext: true,
      };
    case 'preview':
      return {
        title: 'Preview the final voice',
        message: 'Listen to the matched voice with modulation applied. Approve or go back to adjust.',
        actionLabel: 'Play Preview',
        blockNext: false,
      };
    case 'save':
      return {
        title: 'Saving configuration',
        message: 'Persisting your profile, selected voice, and modulation settings.',
        actionLabel: null,
        blockNext: true,
      };
    case 'ready':
      return {
        title: 'Voice engine ready',
        message: 'Your voice setup is saved. You can reuse it or create a new profile.',
        actionLabel: 'Done',
        blockNext: false,
      };
    case 'error':
      return {
        title: 'Engine error',
        message: state.errors[state.errors.length - 1] ?? 'Unknown error.',
        actionLabel: 'Retry',
        blockNext: false,
      };
    default:
      return {
        title: 'Idle',
        message: 'Ready to boot the voice engine.',
        actionLabel: 'Boot Engine',
        blockNext: false,
      };
  }
}

// ─── VoiceEngineController ────────────────────────────────────────────────────

export class VoiceEngineController {
  private state: VoiceEngineState;
  private listeners = new Set<(state: VoiceEngineState) => void>();

  constructor() {
    this.state = createInitialState();
  }

  subscribe(listener: (state: VoiceEngineState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  getState(): VoiceEngineState {
    return structuredClone(this.state);
  }

  private emit(): void {
    const snapshot = this.getState();
    for (const listener of this.listeners) listener(snapshot);
  }

  private setState(patch: Partial<VoiceEngineState>): void {
    this.state = { ...this.state, ...patch };
    this.emit();
  }

  private transition(to: VoicePhase): void {
    if (!canTransition(this.state.phase, to)) {
      throw new Error(`Invalid transition: ${this.state.phase} → ${to}`);
    }
    this.setState({ phase: to });
  }

  private fail(message: string): void {
    this.setState({
      phase: 'error',
      errors: [...this.state.errors, message],
      nextAllowedPhase: 'boot',
    });
  }

  async boot(): Promise<void> {
    try {
      if (!canTransition(this.state.phase, 'boot')) {
        throw new Error('Boot not allowed from current phase.');
      }
      this.transition('boot');

      const support: SupportMatrix = {
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        audioContext: !!window.AudioContext,
        speechSynthesis: !!window.speechSynthesis,
        storage: !!window.localStorage,
      };

      const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      const voiceCatalog = buildVoiceCatalog(voices);

      const savedProfiles = safeJsonParse<VoiceProfile[]>(
        localStorage.getItem(STORAGE_KEYS.profileList),
        []
      );

      const savedConfig = safeJsonParse<SavedConfig | null>(
        localStorage.getItem(STORAGE_KEYS.activeConfig),
        null
      );

      this.setState({
        support,
        voiceCatalog,
        savedProfiles,
        savedConfig,
        errors: [],
        nextAllowedPhase: 'capture',
      });

      this.transition('capture');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Boot failed.');
    }
  }

  async startCapture(): Promise<void> {
    try {
      if (this.state.phase !== 'capture') {
        throw new Error('Capture cannot start in current phase.');
      }

      if (!this.state.support?.getUserMedia || !this.state.support.audioContext) {
        throw new Error('Microphone or audio context not supported.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      mediaStreamSource.connect(analyser);

      this.setState({
        stream,
        audioContext,
        mediaStreamSource,
        analyser,
        sampleMeta: {
          startedAt: Date.now(),
          endedAt: null,
          durationMs: 0,
          signalDetected: false,
          streamActive: true,
        },
      });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Capture start failed.');
    }
  }

  stopCapture(): void {
    try {
      if (!this.state.stream || !this.state.analyser) {
        throw new Error('No active capture stream.');
      }

      const buffer = new Float32Array(this.state.analyser.fftSize);
      this.state.analyser.getFloatTimeDomainData(buffer);

      let signalDetected = false;
      for (let i = 0; i < buffer.length; i++) {
        if (Math.abs(buffer[i]) > 0.01) {
          signalDetected = true;
          break;
        }
      }

      this.state.stream.getTracks().forEach((track) => track.stop());

      const endedAt = Date.now();
      const startedAt = this.state.sampleMeta.startedAt ?? endedAt;
      const durationMs = endedAt - startedAt;

      this.setState({
        stream: null,
        sampleBuffer: buffer,
        sampleMeta: {
          startedAt,
          endedAt,
          durationMs,
          signalDetected,
          streamActive: false,
        },
        nextAllowedPhase: signalDetected && durationMs >= 1500 ? 'analyze' : 'capture',
      });

      if (signalDetected && durationMs >= 1500) {
        this.transition('analyze');
      } else {
        throw new Error('Capture failed validation. Need clearer signal or longer duration.');
      }
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Capture stop failed.');
    }
  }

  analyze(): void {
    try {
      if (this.state.phase !== 'analyze') {
        throw new Error('Analyze not allowed in current phase.');
      }

      if (!this.state.sampleBuffer || !this.state.audioContext) {
        throw new Error('Missing sample buffer.');
      }

      const { avg, peak } = computeEnergy(this.state.sampleBuffer);
      const pitchHz = detectPitchAutocorrelation(
        this.state.sampleBuffer,
        this.state.audioContext.sampleRate
      );
      const toneFamily = classifyToneFamily(pitchHz);
      const stability = estimateStability(this.state.sampleBuffer);
      const qualityScore = scoreSampleQuality(
        pitchHz,
        avg,
        peak,
        this.state.sampleMeta.signalDetected
      );

      const analysis: VoiceAnalysis = {
        pitchHz,
        energyAvg: avg,
        energyPeak: peak,
        toneFamily,
        stability,
        qualityScore,
      };

      this.setState({
        analysis,
        nextAllowedPhase: qualityScore >= 0.6 ? 'profile' : 'capture',
      });

      if (qualityScore >= 0.6) {
        this.transition('profile');
      } else {
        this.transition('capture');
      }
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Analysis failed.');
    }
  }

  buildProfile(label = 'Default'): void {
    try {
      if (this.state.phase !== 'profile') {
        throw new Error('Profile build not allowed in current phase.');
      }
      if (!this.state.analysis) {
        throw new Error('Missing analysis.');
      }

      const now = Date.now();
      const profile: VoiceProfile = {
        id: `voice_${now}`,
        label,
        pitchHz: this.state.analysis.pitchHz,
        energyAvg: this.state.analysis.energyAvg,
        toneFamily: this.state.analysis.toneFamily,
        stability: this.state.analysis.stability,
        preferredVoice: null,
        preferredPreset: null,
        createdAt: now,
        updatedAt: now,
      };

      const nextProfiles = [...this.state.savedProfiles, profile];
      localStorage.setItem(STORAGE_KEYS.profileList, JSON.stringify(nextProfiles));

      this.setState({
        profile,
        savedProfiles: nextProfiles,
        nextAllowedPhase: 'match',
      });

      this.transition('match');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Profile build failed.');
    }
  }

  matchVoices(): void {
    try {
      if (this.state.phase !== 'match') {
        throw new Error('Match not allowed in current phase.');
      }
      if (!this.state.profile) {
        throw new Error('Missing profile.');
      }

      const matchResult = rankVoices(this.state.profile, this.state.voiceCatalog);

      this.setState({
        matchResult,
        nextAllowedPhase: 'modulate',
      });

      this.transition('modulate');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Voice match failed.');
    }
  }

  selectVoice(name: string): void {
    if (!this.state.matchResult) return;
    this.setState({
      matchResult: {
        ...this.state.matchResult,
        selectedVoiceName: name,
      },
    });
  }

  applyPreset(preset: ModulationPreset): void {
    try {
      if (this.state.phase !== 'modulate') {
        throw new Error('Modulation not allowed in current phase.');
      }

      const modulation = { ...DEFAULT_MODULATION_PRESETS[preset] };

      this.setState({
        modulation,
        nextAllowedPhase: 'preview',
      });

      this.transition('preview');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Modulation failed.');
    }
  }

  async preview(previewText: string): Promise<void> {
    try {
      if (this.state.phase !== 'preview') {
        throw new Error('Preview not allowed in current phase.');
      }
      if (!this.state.matchResult?.selectedVoiceName || !this.state.modulation) {
        throw new Error('Missing selected voice or modulation.');
      }

      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.name === this.state.matchResult?.selectedVoiceName) ?? null;

      const utterance = new SpeechSynthesisUtterance(previewText);
      if (voice) utterance.voice = voice;
      utterance.rate = this.state.modulation.rate;
      utterance.pitch = this.state.modulation.pitch;
      utterance.volume = this.state.modulation.volume;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);

      this.setState({
        previewResult: {
          previewText,
          played: true,
          userApproved: false,
        },
        nextAllowedPhase: 'save',
      });
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Preview failed.');
    }
  }

  approvePreview(): void {
    if (!this.state.previewResult) return;
    this.setState({
      previewResult: {
        ...this.state.previewResult,
        userApproved: true,
      },
      nextAllowedPhase: 'save',
    });
  }

  saveFinal(): void {
    try {
      if (this.state.phase !== 'preview') {
        throw new Error('Save must happen from preview state.');
      }
      if (!this.state.previewResult?.userApproved) {
        throw new Error('Preview must be approved before save.');
      }
      if (
        !this.state.profile ||
        !this.state.matchResult?.selectedVoiceName ||
        !this.state.modulation
      ) {
        throw new Error('Missing final configuration parts.');
      }

      this.transition('save');

      const savedConfig: SavedConfig = {
        id: 'voice_config_default',
        profileId: this.state.profile.id,
        voiceName: this.state.matchResult.selectedVoiceName,
        preset: this.state.modulation.preset,
        rate: this.state.modulation.rate,
        pitch: this.state.modulation.pitch,
        volume: this.state.modulation.volume,
        savedAt: Date.now(),
      };

      localStorage.setItem(STORAGE_KEYS.activeConfig, JSON.stringify(savedConfig));

      this.setState({
        savedConfig,
        nextAllowedPhase: 'ready',
      });

      this.transition('ready');
    } catch (error) {
      this.fail(error instanceof Error ? error.message : 'Save failed.');
    }
  }

  resetToCapture(): void {
    this.setState({
      phase: 'capture',
      errors: [],
      nextAllowedPhase: 'capture',
      sampleBuffer: null,
      analysis: null,
      profile: null,
      matchResult: null,
      modulation: null,
      previewResult: null,
    });
  }
}
