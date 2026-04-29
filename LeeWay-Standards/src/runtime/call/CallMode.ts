/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: RUNTIME.CALL.MODE.CONTROLLER
REGION: 🔵 RUNTIME
PURPOSE: Orchestrates real-time call sessions with voice I/O, turn-taking, and governance integration
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/// <reference path="../speech-recognition.d.ts" />

import { cancelSpeech, speakDirectWithSavedVoice, getCurrentVoice } from '../voice/voice-output';
import { loadVoiceConfig } from '../voice/voice-config';

/**
 * Call Mode Session State
 * Exposed to UI components for real-time status
 */
export interface CallModeSessionState {
  active: boolean;
  phase: 'idle' | 'listening' | 'processing' | 'speaking' | 'error';
  micOpen: boolean;
  currentVoiceName: string | null;
  interrupted: boolean;
  lastError: string | null;
  transcript: string;
  isProcessing: boolean;
}

/**
 * Call Mode event listener type
 */
export type CallModeEventListener = (state: CallModeSessionState) => void;

/**
 * CallMode Controller — Main orchestration engine
 * Manages microphone, speech recognition, processing handoff, and speech synthesis
 */
class CallModeController {
  private state: CallModeSessionState = {
    active: false,
    phase: 'idle',
    micOpen: false,
    currentVoiceName: null,
    interrupted: false,
    lastError: null,
    transcript: '',
    isProcessing: false,
  };

  private listeners: CallModeEventListener[] = [];
  private recognition: SpeechRecognition | null = null;
  private mediaStream: MediaStream | null = null;
  private isSpeakingManually = false;

  // Speech detection thresholds
  private silenceTimeout: NodeJS.Timeout | null = null;
  private silenceThresholdMs = 1500; // Pause after speech before processing
  private maxSilenceMs = 30000; // Max listening duration before timeout

  /**
   * Initialize the Call Mode controller
   * Must be called once at app startup
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.setState({ lastError: 'Speech Recognition not supported in this browser' });
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition!.continuous = true;
    this.recognition!.interimResults = true;
    this.recognition!.lang = 'en-US';

    this.recognition!.onstart = () => {
      this.setState({ phase: 'listening', micOpen: true, lastError: null });
    };

    this.recognition!.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      const currentTranscript = (this.state.transcript + final + interim).trim();
      this.setState({ transcript: currentTranscript });

      // If we got final text, queue processing
      if (final.trim()) {
        this.resetSilenceTimer();
      }
    };

    this.recognition!.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.setState({ lastError: `Speech recognition error: ${event.error}`, phase: 'error' });
    };

    this.recognition!.onend = () => {
      this.setState({ phase: 'idle', micOpen: false });
    };
  }

  /**
   * Start a call session
   */
  startSession(): void {
    if (this.state.active) {
      console.warn('Call session already active');
      return;
    }

    if (!this.recognition) {
      this.setState({ lastError: 'Speech Recognition not initialized' });
      return;
    }

    // Request microphone permission
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.mediaStream = stream;
          this.setState({ active: true, phase: 'listening', micOpen: true, lastError: null });
          this.recognition!.start();
        })
        .catch((err) => {
          this.setState({
            lastError: `Microphone access denied: ${err.message}`,
            phase: 'error',
          });
        });
    } else {
      this.setState({ lastError: 'getUserMedia not supported' });
    }
  }

  /**
   * End the call session
   */
  stopSession(): void {
    if (!this.state.active) return;

    if (this.recognition) {
      this.recognition!.stop();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    cancelSpeech();
    this.clearSilenceTimer();

    this.setState({
      active: false,
      phase: 'idle',
      micOpen: false,
      transcript: '',
    });
  }

  /**
   * Mute the microphone (pause listening)
   */
  pauseListening(): void {
    if (this.recognition && this.state.micOpen) {
      this.recognition!.stop();
      this.setState({ micOpen: false, phase: 'processing' });
    }
  }

  /**
   * Resume listening
   */
  resumeListening(): void {
    if (this.recognition && this.state.active && !this.state.micOpen) {
      this.recognition!.start();
      this.setState({ micOpen: true, phase: 'listening', transcript: '' });
    }
  }

  /**
   * User interrupt — cancel agent speech and resume listening
   * Called when user starts speaking while agent is talking
   */
  interrupt(): void {
    if (this.isSpeakingManually) {
      cancelSpeech();
      this.isSpeakingManually = false;
      this.setState({ interrupted: true });

      // Resume listening after a short pause
      setTimeout(() => {
        if (this.state.active) {
          this.resumeListening();
          this.setState({ interrupted: false });
        }
      }, 500);
    }
  }

  /**
   * Send captured input to agent pipeline
   * This is called after silence is detected and input is ready for processing
   * Must integrate with existing governance layer
   */
  async processInput(input: string): Promise<void> {
    if (!input || !this.state.active) return;

    this.pauseListening();
    this.setState({ phase: 'processing', isProcessing: true });

    try {
      // TODO: Hand off to existing agent pipeline
      // The agent should:
      // 1. Process the user input
      // 2. Generate a response
      // 3. Route through governance for approval
      // 4. Return the approved response or rejection
      // For now, we'll assume an external handler will be provided

      // Placeholder: wait for response
      await new Promise((resolve) => setTimeout(resolve, 500));

      // After processing, resume listening if still active
      if (this.state.active) {
        this.resumeListening();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState({ lastError: errorMsg, phase: 'error' });
    } finally {
      this.setState({ isProcessing: false });
    }
  }

  /**
   * Speak a response approved by governance
   * This should be called by the agent pipeline after response is approved
   */
  speakResponse(text: string): void {
    if (!text) return;

    // Pause listening while speaking
    this.pauseListening();
    this.isSpeakingManually = true;

    this.setState({ phase: 'speaking' });

    speakDirectWithSavedVoice(
      text,
      () => {
        // On start
      },
      () => {
        // On end
        this.isSpeakingManually = false;
        if (this.state.active) {
          this.resumeListening();
        }
      }
    );
  }

  /**
   * Get current session state
   */
  getState(): CallModeSessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: CallModeEventListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Internal: Update state and notify listeners
   */
  private setState(partial: Partial<CallModeSessionState>): void {
    this.state = { ...this.state, ...partial };

    // Update voice name from config
    if (!this.state.currentVoiceName) {
      const voice = getCurrentVoice();
      this.state.currentVoiceName = voice?.name || null;
    }

    // Notify all listeners
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Internal: Reset silence timer for speech end detection
   */
  private resetSilenceTimer(): void {
    this.clearSilenceTimer();

    this.silenceTimeout = setTimeout(() => {
      if (this.state.transcript && this.state.active) {
        // Silence threshold reached — process the transcript
        const input = this.state.transcript.trim();
        this.processInput(input);
      }
    }, this.silenceThresholdMs);
  }

  /**
   * Internal: Clear silence timer
   */
  private clearSilenceTimer(): void {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }
}

// Singleton instance
export const callModeController = new CallModeController();

/**
 * Hook for React components to subscribe to Call Mode state
 */
export function useCallModeState(): CallModeSessionState {
  const [state, setState] = React.useState<CallModeSessionState>(
    callModeController.getState()
  );

  React.useEffect(() => {
    const unsubscribe = callModeController.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

// Lazy import React for hook
let React: typeof import('react');
try {
  React = require('react');
} catch {
  // React not available in module context
}
