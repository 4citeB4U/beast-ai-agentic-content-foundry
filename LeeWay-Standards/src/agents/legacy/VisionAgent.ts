/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI
TAG: CORE.SDK.VISIONAGENT.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = VisionAgent module
WHY = Part of AI region
WHO = LEEWAY Align Agent
WHERE = agents\VisionAgent.ts
WHEN = 2026
HOW = Deterministic vision placeholder with manual-review guidance and event emission

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

import { eventBus } from '../../core/EventBus';

interface VisionAnalysis {
  screen_text: string;
  scene_summary: string;
  ui_hints: string[];
}

function buildDeterministicAnalysis(imageBase64: string, mimeType: string): VisionAnalysis {
  const approxBytes = Math.max(0, Math.floor((imageBase64.length * 3) / 4));
  return {
    screen_text: '',
    scene_summary: `Vision payload accepted (${mimeType}, ~${approxBytes} bytes). Automated semantic inference is disabled; manual operator review is required.`,
    ui_hints: [
      'Use live camera preview for observation only.',
      'Route interpretation through governed human review.',
      'Do not treat this module as an autonomous scene classifier.',
    ],
  };
}

export class VisionAgent {
  static async handleRtcFrame(imageBase64: string, mimeType = 'image/png'): Promise<void> {
    await VisionAgent.analyseImage(imageBase64, mimeType);
  }

  static async captureAndAnalyse(): Promise<void> {
    let imageBase64: string;
    try {
      imageBase64 = await VisionAgent._captureScreenBase64();
    } catch (err) {
      eventBus.emit('agent:error', { agent: 'Vision', error: `Screen capture failed: ${String(err)}` });
      return;
    }

    await VisionAgent.analyseImage(imageBase64);
  }

  static async captureAndAnalyze(): Promise<void> {
    await VisionAgent.captureAndAnalyse();
  }

  static async analyseImage(imageBase64: string, mimeType = 'image/png'): Promise<void> {
    eventBus.emit('agent:active', { agent: 'Vision', task: 'Deterministic image intake' });

    if (!imageBase64.trim()) {
      eventBus.emit('agent:error', { agent: 'Vision', error: 'No image payload provided.' });
      return;
    }

    const parsed = buildDeterministicAnalysis(imageBase64, mimeType);
    eventBus.emit('vision:screen_text', { text: parsed.screen_text, confidence: 0.1 });
    eventBus.emit('vision:scene_summary', { summary: parsed.scene_summary });
    eventBus.emit('vision:ui_hints', { hints: parsed.ui_hints });
    eventBus.emit('agent:done', { agent: 'Vision', result: parsed.scene_summary });
  }

  private static async _captureScreenBase64(): Promise<string> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error('Display capture is not available in this environment.');
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    const track = stream.getVideoTracks()[0];
    const imageCaptureCtor = (window as unknown as {
      ImageCapture?: new (track: MediaStreamTrack) => { grabFrame(): Promise<ImageBitmap> };
    }).ImageCapture;

    if (!track || !imageCaptureCtor) {
      track?.stop();
      throw new Error('ImageCapture API not available in this browser.');
    }

    const imageCapture = new imageCaptureCtor(track);
    const bitmap = await imageCapture.grabFrame();
    track.stop();

    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to create 2D canvas context.');
    }

    ctx.drawImage(bitmap, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1] ?? '';
  }
}