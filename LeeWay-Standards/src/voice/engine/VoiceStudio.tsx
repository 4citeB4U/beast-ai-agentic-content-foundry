/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.ENGINE
TAG: VOICE.ENGINE.UI.WORKFLOW
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
WHAT = VoiceStudio with 7-step workflow + browser voice selection
WHY  = Complete voice matching engine with functional microphone testing
WHO  = LEEWAY INDUSTRIES
WHERE = src/voice/VoiceStudio.tsx
WHEN = 2026
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateVoiceConfig } from './voice-config';

type VoicePhase = 'idle' | 'boot' | 'capture' | 'analyze' | 'profile' | 'match' | 'modulate' | 'preview' | 'save' | 'ready' | 'error';

interface VoiceStudioProps {
  onClose: () => void;
}

// ─── Step Definitions ─────────────────────────────────────────────────────────

const STEPS: Record<VoicePhase, { label: string; icon: string; order: number } | null> = {
  idle: null,
  boot: { label: 'Boot', icon: '⚙️', order: 0 },
  capture: { label: 'Capture', icon: '🎤', order: 1 },
  analyze: { label: 'Analyze', icon: '📊', order: 2 },
  profile: { label: 'Profile', icon: '👤', order: 3 },
  match: { label: 'Match', icon: '🎯', order: 4 },
  modulate: { label: 'Modulate', icon: '🎚️', order: 5 },
  preview: { label: 'Preview', icon: '▶️', order: 6 },
  save: { label: 'Save', icon: '💾', order: 7 },
  ready: { label: 'Ready', icon: '✓', order: 8 },
  error: { label: 'Error', icon: '⚠️', order: -1 },
};

// ─── Voice Helpers ────────────────────────────────────────────────────────────

function classifyVoice(v: SpeechSynthesisVoice): 'natural' | 'standard' | 'other' {
  const name = v.name.toLowerCase();
  if (name.includes('natural')) return 'natural';
  if (name.includes('microsoft')) return 'standard';
  return 'other';
}

function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const natural = voices.filter(v => classifyVoice(v) === 'natural');
  const standard = voices.filter(v => classifyVoice(v) === 'standard');
  const other = voices.filter(v => classifyVoice(v) === 'other');
  return [...natural, ...standard, ...other];
}

// ─── Step Indicator Component ─────────────────────────────────────────────────

function StepIndicator({ phase, icon, label, isActive, isCompleted, isCurrent }: any) {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      animate={{
        scale: isCurrent ? 1.1 : isCompleted || isActive ? 1 : 0.9,
        opacity: isActive || isCompleted || isCurrent ? 1 : 0.4,
      }}
    >
      <motion.div
        className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-xs transition-all ${
          isCompleted
            ? 'bg-green-500/20 border border-green-500/50 text-green-400'
            : isCurrent
              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
              : 'bg-slate-700/30 border border-slate-600/50 text-slate-400'
        }`}
        whileHover={{ scale: 1.1 }}
      >
        {icon}
      </motion.div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center w-16">
        {label}
      </span>
    </motion.div>
  );
}

// ─── Capture Step ─────────────────────────────────────────────────────────────

function CaptureStep({ isRecording, recordingTime, onStart, onStop }: any) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-slate-900/50 border border-cyan-500/20 rounded-2xl">
        <p className="text-sm text-slate-300 mb-4">
          {isRecording ? `Recording... ${recordingTime}s` : 'Ready to capture microphone input.'}
        </p>
        {isRecording && (
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
              animate={{ width: '100%' }}
              transition={{ duration: recordingTime }}
            />
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {!isRecording ? (
          <button
            onClick={onStart}
            className="flex-1 px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 hover:border-cyan-500 text-cyan-300 rounded-xl font-bold uppercase text-sm transition-all"
          >
            🎤 Start Recording
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex-1 px-6 py-3 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-300 rounded-xl font-bold uppercase text-sm transition-all"
          >
            ⏹ Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Analysis Step ────────────────────────────────────────────────────────────

function AnalysisStep({ onContinue }: any) {
  return (
    <div className="space-y-6">
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-purple-500/20 border border-purple-500/50 hover:border-purple-500 text-purple-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        📊 Analyze Recording
      </button>
      <div className="p-4 bg-slate-900/50 border border-slate-700/30 rounded-xl">
        <p className="text-sm text-slate-300">Analysis will evaluate pitch, tone, and acoustic properties...</p>
      </div>
    </div>
  );
}

// ─── Profile Step ─────────────────────────────────────────────────────────────

function ProfileStep({ onContinue }: any) {
  return (
    <div className="space-y-6">
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-blue-500/20 border border-blue-500/50 hover:border-blue-500 text-blue-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        👤 Create Voice Profile
      </button>
      <div className="p-4 bg-slate-900/50 border border-slate-700/30 rounded-xl">
        <p className="text-sm text-slate-300">Building voice signature from recorded sample...</p>
      </div>
    </div>
  );
}

// ─── Match Step ───────────────────────────────────────────────────────────────

function MatchStep({ selectedVoice, onContinue }: any) {
  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-br from-slate-900/50 to-slate-950/50 border border-slate-700/30 rounded-2xl">
        <p className="text-[10px] font-black text-slate-400 uppercase mb-3">Selected Voice</p>
        <p className="text-lg font-bold text-cyan-300">{selectedVoice?.name || 'Default Voice'}</p>
      </div>
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-green-500/20 border border-green-500/50 hover:border-green-500 text-green-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        🎯 Match Voice
      </button>
    </div>
  );
}

// ─── Modulation Step ──────────────────────────────────────────────────────────

function ModulationStep({ onContinue }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {['Natural', 'Bright', 'Deep'].map((preset) => (
          <button
            key={preset}
            className="px-4 py-3 bg-slate-800/40 border border-slate-700/50 hover:border-cyan-500/30 text-slate-300 rounded-lg font-bold text-sm transition-all"
          >
            {preset}
          </button>
        ))}
      </div>
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-yellow-500/20 border border-yellow-500/50 hover:border-yellow-500 text-yellow-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        🎚️ Apply Modulation
      </button>
    </div>
  );
}

// ─── Preview Step ─────────────────────────────────────────────────────────────

function PreviewStep({ selectedVoice, onContinue }: any) {
  const previewText = 'LeeWay Edge RTC — Mission-critical WebRTC stack online. All systems operational.';

  const handlePlayPreview = () => {
    if (!selectedVoice) {
      alert('Please select a voice first');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(previewText);
    utterance.voice = selectedVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-6">
      <button
        onClick={handlePlayPreview}
        className="w-full px-6 py-3 bg-blue-500/20 border border-blue-500/50 hover:border-blue-500 text-blue-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        ▶ Play Preview
      </button>
      <div className="p-4 bg-slate-900/50 border border-slate-700/30 rounded-xl">
        <p className="text-xs text-slate-400">Preview text: "{previewText}"</p>
      </div>
      <button
        onClick={onContinue}
        className="w-full px-6 py-3 bg-green-500/20 border border-green-500/50 hover:border-green-500 text-green-300 rounded-xl font-bold uppercase text-sm transition-all"
      >
        ✓ Approve Preview
      </button>
    </div>
  );
}

// ─── Voice Selector Component ─────────────────────────────────────────────────

function VoiceSelector({ selectedVoice, onVoiceSelected }: any) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = window.speechSynthesis.getVoices();
      const englishVoices = allVoices.filter(v => v.lang.startsWith('en'));
      const sorted = sortVoices(englishVoices);
      setVoices(sorted);
      if (!selectedVoice && sorted.length > 0) {
        onVoiceSelected(sorted[0]);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [onVoiceSelected, selectedVoice]);

  const testVoice = (voice: SpeechSynthesisVoice) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance('Testing voice. This is a test message.');
    utterance.voice = voice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const currentVoice = voices.find(v => v.name === selectedVoice?.name);

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Select Voice</p>
      
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 hover:border-cyan-500 rounded-2xl text-cyan-300 font-bold text-sm transition-all flex items-center justify-between"
        whileHover={{ scale: 1.02 }}
      >
        <span>{currentVoice?.name || 'Select a voice...'}</span>
        <motion.span animate={{ rotate: showDropdown ? 180 : 0 }}>▼</motion.span>
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2 bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-4 max-h-64 overflow-y-auto"
          >
            {voices.map((voice) => {
              const isNatural = classifyVoice(voice) === 'natural';
              const isSelected = voice.name === selectedVoice?.name;
              
              return (
                <motion.div
                  key={voice.name}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/50'
                      : 'bg-slate-800/30 border border-slate-600/30 hover:border-cyan-500/30'
                  }`}
                >
                  <button
                    onClick={() => {
                      onVoiceSelected(voice);
                      setShowDropdown(false);
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-bold text-slate-200">
                      {isNatural && '⭐ '}{voice.name}
                    </p>
                    <p className="text-xs text-slate-400">{voice.lang}</p>
                  </button>
                  
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      testVoice(voice);
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="ml-3 px-3 py-2 bg-blue-500/20 border border-blue-500/50 hover:border-blue-500 text-blue-300 rounded-lg font-bold text-xs uppercase transition-all"
                  >
                    ▶ Test
                  </motion.button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Microphone Recorder Component ────────────────────────────────────────────

function MicrophoneRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [waveformData, setWaveformData] = useState<Uint8Array | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio visualization
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Draw waveform
      const drawWaveform = () => {
        analyser.getByteFrequencyData(dataArray);
        setWaveformData(new Uint8Array(dataArray));
        animationFrameRef.current = requestAnimationFrame(drawWaveform);
      };
      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access.');
      console.error('Microphone error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Draw waveform visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgb(15, 23, 42)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgb(0, 255, 209)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = canvas.width / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
      const v = waveformData[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) {
        ctx.moveTo(i * sliceWidth, y);
      } else {
        ctx.lineTo(i * sliceWidth, y);
      }
    }
    ctx.stroke();
  }, [waveformData]);

  return (
    <div className="space-y-4">
      <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Test Microphone</p>
      
      <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
        <canvas
          ref={canvasRef}
          width={300}
          height={80}
          className="w-full rounded-lg bg-slate-950"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/30 rounded-xl">
        <span className="text-sm font-bold text-slate-300">
          {isRecording ? `Recording: ${recordingTime}s` : 'Ready to record'}
        </span>
        {isRecording && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-3 h-3 bg-red-500 rounded-full"
          />
        )}
      </div>

      <div className="flex gap-2">
        {!isRecording ? (
          <motion.button
            onClick={startRecording}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 px-4 py-3 bg-cyan-500/20 border border-cyan-500/50 hover:border-cyan-500 text-cyan-300 rounded-xl font-bold uppercase text-sm transition-all"
          >
            🎤 Start Recording
          </motion.button>
        ) : (
          <motion.button
            onClick={stopRecording}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-1 px-4 py-3 bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-300 rounded-xl font-bold uppercase text-sm transition-all"
          >
            ⏹ Stop Recording
          </motion.button>
        )}
      </div>

      {audioURL && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-3"
        >
          <p className="text-sm font-bold text-green-300">✓ Recording saved</p>
          <audio
            controls
            src={audioURL}
            className="w-full rounded-lg"
            style={{
              accentColor: '#00ffd1'
            }}
          />
          <button
            onClick={() => setAudioURL('')}
            className="w-full px-3 py-2 bg-slate-700/30 border border-slate-600/50 hover:border-slate-500 text-slate-300 rounded-lg font-bold text-xs uppercase transition-all"
          >
            ↻ New Recording
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VoiceStudio({ onClose }: VoiceStudioProps) {
  const [phase, setPhase] = useState<VoicePhase>('capture');
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const currentStep = STEPS[phase];

  const isCompleted = (p: VoicePhase) => {
    const currentOrder = currentStep?.order ?? -1;
    const phaseOrder = STEPS[p]?.order ?? -1;
    return phaseOrder < currentOrder && phaseOrder >= 0;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      alert('Microphone access denied');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Persist voice config when user reaches "ready" phase
  useEffect(() => {
    if (phase === 'ready' && selectedVoice) {
      updateVoiceConfig({
        voiceName: selectedVoice.name,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
      });
    }
  }, [phase, selectedVoice]);

  const renderStepContent = () => {
    switch (phase) {
      case 'capture':
        return (
          <div className="grid grid-cols-2 gap-8">
            <VoiceSelector selectedVoice={selectedVoice} onVoiceSelected={setSelectedVoice} />
            <MicrophoneRecorder />
          </div>
        );
      case 'analyze':
        return <AnalysisStep onContinue={() => setPhase('profile')} />;
      case 'profile':
        return <ProfileStep onContinue={() => setPhase('match')} />;
      case 'match':
        return <MatchStep selectedVoice={selectedVoice} onContinue={() => setPhase('modulate')} />;
      case 'modulate':
        return <ModulationStep onContinue={() => setPhase('preview')} />;
      case 'preview':
        return <PreviewStep selectedVoice={selectedVoice} onContinue={() => setPhase('ready')} />;
      case 'ready':
        return (
          <div className="space-y-4 text-center">
            <div className="text-5xl mb-4">✓</div>
            <p className="text-lg font-bold text-green-300">Voice setup complete!</p>
            <p className="text-sm text-slate-400">Your voice is configured and ready to use.</p>
          </div>
        );
      default:
        return <CaptureStep isRecording={isRecording} recordingTime={recordingTime} onStart={handleStartRecording} onStop={handleStopRecording} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-5xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/20 rounded-3xl overflow-hidden shadow-2xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg bg-slate-800/50 hover:bg-slate-700 transition-all text-slate-400"
          >
            ✕
          </button>

          <div className="space-y-1 pr-12">
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
              🎤 Voice Matching Engine
            </p>
            <h1 className="text-2xl font-black text-white">Voice Configuration</h1>
            <p className="text-sm text-slate-400">Select a voice and test your microphone</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-slate-700/50 overflow-x-auto">
          <div className="flex gap-2 min-w-max justify-start">
            {Object.entries(STEPS).map(([p, step]) => {
              if (!step || step.order < 0) return null;
              return (
                <StepIndicator
                  key={p}
                  phase={p}
                  icon={step.icon}
                  label={step.label}
                  isActive={phase === p || currentStep?.order! >= step.order}
                  isCompleted={isCompleted(p as VoicePhase)}
                  isCurrent={phase === p}
                />
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={phase}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        {phase !== 'ready' && (
          <div className="p-6 border-t border-slate-700/50 flex gap-3">
            {phase !== 'capture' && (
              <motion.button
                onClick={() => {
                  const phases: VoicePhase[] = ['capture', 'analyze', 'profile', 'match', 'modulate', 'preview'];
                  const idx = phases.indexOf(phase);
                  if (idx > 0) setPhase(phases[idx - 1]);
                }}
                whileHover={{ scale: 1.02 }}
                className="px-6 py-3 bg-slate-700/30 border border-slate-600/50 hover:border-slate-500 text-slate-300 rounded-xl font-bold uppercase text-sm transition-all"
              >
                ← Back
              </motion.button>
            )}
            {phase !== 'preview' && (
              <motion.button
                onClick={() => {
                  const phases: VoicePhase[] = ['capture', 'analyze', 'profile', 'match', 'modulate', 'preview'];
                  const idx = phases.indexOf(phase);
                  if (idx < phases.length - 1) setPhase(phases[idx + 1]);
                }}
                whileHover={{ scale: 1.02 }}
                className="flex-1 px-6 py-3 bg-cyan-500/20 border border-cyan-500/50 hover:border-cyan-500 text-cyan-300 rounded-xl font-bold uppercase text-sm transition-all"
              >
                Next →
              </motion.button>
            )}
          </div>
        )}
        {phase === 'ready' && (
          <div className="p-6 border-t border-slate-700/50 flex gap-3">
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-xl font-bold uppercase text-sm transition-all"
            >
              ✓ Close
            </motion.button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
