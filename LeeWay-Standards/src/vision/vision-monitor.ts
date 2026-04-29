/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: AI.VISION.MONITOR.ENGINE.MAIN
REGION: 🧠 AI
DISCOVERY_PIPELINE:
Voice → Intent → Vision Monitor → Environment → Runtime Mode → Output

PURPOSE:
Enhance the existing LeeWay runtime with a lightweight, always-on vision monitor that operates under current governance and runtime constraints.

CONSTRAINTS:
- Must obey Guardian runtime mode (ultra-light, balanced, full)
- Must NOT introduce new governance logic
- Must remain <3% CPU usage
- Must emit compact telemetry only

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { RuntimeMode } from './types';

export interface MonitorState {
  ts: number;
  brightness: number;
  blur: number;
  motion: number;
  facePresent: boolean;
  runtimeMode: RuntimeMode;
}

class VisionMonitor {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private lastFrameData: ImageData | null = null;
  private animationFrameId: number | null = null;
  private runtimeMode: RuntimeMode = 'balanced';
  private throttleInterval: number = 150; // ms
  private lastProcessTime: number = 0;
  private currentState: MonitorState | null = null;

  async initialize(video: HTMLVideoElement): Promise<void> {
    this.videoElement = video;
    this.canvas = new OffscreenCanvas(320, 240);
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('Failed to get canvas context');
  }

  setRuntimeMode(mode: RuntimeMode): void {
    this.runtimeMode = mode;
    // Adjust throttle based on mode
    switch (mode) {
      case 'ultra-light':
        this.throttleInterval = 300;
        break;
      case 'balanced':
        this.throttleInterval = 150;
        break;
      case 'full':
        this.throttleInterval = 100;
        break;
    }
  }

  start(onMonitorState: (state: MonitorState) => void): void {
    const processFrame = () => {
      const now = Date.now();
      if (now - this.lastProcessTime < this.throttleInterval) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      if (!this.videoElement || !this.ctx) {
        this.animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      try {
        // Draw video frame to canvas
        this.ctx.drawImage(this.videoElement, 0, 0, 320, 240);
        const frameData = this.ctx.getImageData(0, 0, 320, 240);

        // Compute metrics
        const brightness = this.computeBrightness(frameData);
        const blur = this.runtimeMode !== 'ultra-light' ? this.computeBlur(frameData) : 0;
        const motion = this.computeMotion(frameData);
        const facePresent = this.runtimeMode === 'full' ? this.detectFacePresence(frameData) : false;

        this.lastFrameData = frameData;
        this.lastProcessTime = now;

        const state: MonitorState = {
          ts: Date.now(),
          brightness,
          blur,
          motion,
          facePresent,
          runtimeMode: this.runtimeMode,
        };

        this.currentState = state;
        onMonitorState(state);
      } catch (err) {
        console.error('Vision monitor error:', err);
      }

      this.animationFrameId = requestAnimationFrame(processFrame);
    };

    this.animationFrameId = requestAnimationFrame(processFrame);
  }

  getState(): MonitorState | null {
    return this.currentState;
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private computeBrightness(frameData: ImageData): number {
    const data = frameData.data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (frameData.width * frameData.height) / 255;
  }

  private computeBlur(frameData: ImageData): number {
    const data = frameData.data;
    const width = frameData.width;
    let variance = 0;
    let sum = 0;

    for (let i = 0; i < data.length; i += 4) {
      const val = data[i];
      sum += val;
      variance += val * val;
    }

    const mean = sum / (frameData.width * frameData.height);
    const v = variance / (frameData.width * frameData.height) - mean * mean;
    return Math.min(v / 1000, 1); // Normalize 0-1
  }

  private computeMotion(frameData: ImageData): number {
    if (!this.lastFrameData) return 0;

    const current = frameData.data;
    const prev = this.lastFrameData.data;
    let diff = 0;

    for (let i = 0; i < current.length; i += 4) {
      const r = Math.abs(current[i] - prev[i]);
      const g = Math.abs(current[i + 1] - prev[i + 1]);
      const b = Math.abs(current[i + 2] - prev[i + 2]);
      diff += (r + g + b) / 3;
    }

    return Math.min(diff / (frameData.width * frameData.height) / 255, 1);
  }

  private detectFacePresence(frameData: ImageData): boolean {
    // Simple skin tone detection as proxy for face presence
    const data = frameData.data;
    let skinPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skin tone heuristic
      if (
        r > 95 &&
        g > 40 &&
        b > 20 &&
        r - g > 15 &&
        r - b > 15
      ) {
        skinPixels++;
      }
    }

    const skinRatio = skinPixels / (frameData.width * frameData.height);
    return skinRatio > 0.05; // At least 5% skin tone
  }
}

export default new VisionMonitor();
