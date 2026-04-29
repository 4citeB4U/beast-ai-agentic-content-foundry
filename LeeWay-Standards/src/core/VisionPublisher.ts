/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.VISIONPUBLISHER.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = VisionPublisher module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\VisionPublisher.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

/**
 * VISION PUBLISHER
 * ================
 * 
 * Feeds camera frames and vision detections into PerceptionBus.
 * 
 * Responsibilities:
 * 1. Capture video frames from camera or canvas
 * 2. Perform or receive vision detections (object/face/scene)
 * 3. Publish structured vision events
 * 4. Track FPS and detection rate
 * 
 * Usage:
 *   const vp = VisionPublisher.getInstance();
 *   await vp.start(); // Start camera
 *   // Camera frames automatically published to PerceptionBus
 *   await vp.stop();
 */

import { PerceptionBus, VisionDetection } from './PerceptionBus';
import { eventBus } from './EventBus';

/**
 * VISION STATE
 */
export enum VisionState {
  IDLE = 'idle',
  REQUESTING_PERMISSION = 'requesting_permission',
  CAPTURING = 'capturing',
  ERROR = 'error'
}

/**
 * VISION STATISTICS
 */
export interface VisionStats {
  framesProcessed: number;
  averageFPS: number;
  detectionStats: {
    faces: number;
    objects: number;
    gestures: number;
    text: number;
  };
  lastFrameTime: number;
}

/**
 * VISION PUBLISHER
 */
export class VisionPublisher {
  private static instance: VisionPublisher;

  // Lifecycle
  private state: VisionState = VisionState.IDLE;
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;

  // Processing
  private captureInterval: number | null = null;
  private frameRate = 15; // FPS (raw)
  private lastPublishedTime: number = 0; // For throttling VISION_PACKETs
  private perceptionBus: PerceptionBus;

  // Statistics
  private stats: VisionStats = {
    framesProcessed: 0,
    averageFPS: 0,
    detectionStats: {
      faces: 0,
      objects: 0,
      gestures: 0,
      text: 0
    },
    lastFrameTime: 0
  };

  private constructor() {
    this.perceptionBus = PerceptionBus.getInstance();
  }

  /**
   * GET SINGLETON
   */
  static getInstance(): VisionPublisher {
    if (!VisionPublisher.instance) {
      VisionPublisher.instance = new VisionPublisher();
    }
    return VisionPublisher.instance;
  }

  /**
   * START CAMERA
   * 
   * Flow:
   * 1. Request camera permission
   * 2. Setup video element + canvas
   * 3. Start frame capture loop
   * 4. Begin vision processing
   */
  async start(videoElement?: HTMLVideoElement): Promise<void> {
    if (this.state !== VisionState.IDLE) {
      console.warn('[VisionPublisher] Already started, state:', this.state);
      return;
    }

    console.log('[VisionPublisher] Starting vision capture...');
    this.setState(VisionState.REQUESTING_PERMISSION);

    try {
      // 1. REQUEST CAMERA PERMISSION
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });

      // 2. SETUP VIDEO ELEMENT
      if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.style.display = 'none';
        document.body.appendChild(videoElement);
      }

      this.videoElement = videoElement;
      this.videoElement.srcObject = this.mediaStream;

      await new Promise(resolve => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          resolve(null);
        };
      });

      // 3. SETUP CANVAS FOR FRAME CAPTURE
      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
      this.canvasContext = this.canvasElement.getContext('2d');

      // 4. START CAPTURE LOOP
      this.startCaptureLoop();

      this.setState(VisionState.CAPTURING);

      eventBus.emit('vision:started' as any, {
        width: this.canvasElement.width,
        height: this.canvasElement.height,
        fps: this.frameRate
      });

    } catch (error) {
      console.error('[VisionPublisher] Start failed:', error);
      this.setState(VisionState.ERROR);
      eventBus.emit('vision:error' as any, {
        error: String(error),
        context: 'start'
      });
      throw error;
    }
  }

  /**
   * STOP CAMERA
   */
  async stop(): Promise<void> {
    console.log('[VisionPublisher] Stopping vision capture');

    if (this.captureInterval !== null) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      // Don't remove from DOM, let caller handle it
    }

    this.canvasContext = null;
    this.canvasElement = null;

    this.setState(VisionState.IDLE);
  }

  /**
   * START CAPTURE LOOP
   * 
   * Captures frames at specified FPS, publishes to PerceptionBus
   */
  private startCaptureLoop(): void {
    const interval = 1000 / this.frameRate;

    this.captureInterval = window.setInterval(() => {
      this.captureFrame();
    }, interval);
  }

  /**
   * CAPTURE SINGLE FRAME
   * 
   * 1. Draw video to canvas
   * 2. Get image data
   * 3. Perform/receive detections
   * 4. Publish to PerceptionBus
   */
  private async captureFrame(): Promise<void> {
    // Throttle: Only publish to PerceptionBus every 500ms (2 FPS)
    const now = Date.now();
    if (now - this.lastPublishedTime < 500) return;
    this.lastPublishedTime = now;
    if (!this.videoElement || !this.canvasContext || !this.canvasElement) return;

    try {
      // Draw video frame to canvas
      this.canvasContext.drawImage(
        this.videoElement,
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      // Get image data
      const imageData = this.canvasContext.getImageData(
        0,
        0,
        this.canvasElement.width,
        this.canvasElement.height
      );

      // Optionally: send to vision API here (e.g., leeway Vision, local YOLO)
      // For now, we'll create mock detections
      const detections = await this.detectObjects(imageData);

      // Publish to PerceptionBus
      await this.perceptionBus.publish({
        id: `vision_${Date.now()}`,
        type: 'vision',
        source: 'VisionPublisher',
        timestamp: Date.now(),
        payload: {
          kind: 'vision',
          state: 'processing',
          frame: {
            width: this.canvasElement.width,
            height: this.canvasElement.height,
            rotation: 0,
            format: 'rgba'
          },
          detections,
          sceneDescription: this.describeScene(detections)
        }
      });

      this.stats.framesProcessed++;
      this.stats.lastFrameTime = Date.now();

    } catch (error) {
      console.error('[VisionPublisher] Error processing frame:', error);
    }
  }

  /**
   * DETECT OBJECTS IN FRAME
   * 
   * This is where you'd integrate:
   * - local YOLO/MobileNet
   * - leeway Vision API
   * - cloud vision service
   * 
   * For now: mock detections
   */
  private async detectObjects(imageData: ImageData): Promise<VisionDetection[]> {
    // MOCK: Return empty detections
    // In production, call your vision API here

    return [
      // Example detection:
      // {
      //   type: 'face',
      //   label: 'person',
      //   confidence: 0.95,
      //   bounds: { x: 100, y: 50, width: 200, height: 250 }
      // }
    ];
  }

  /**
   * DESCRIBE SCENE
   * 
   * Generate natural language description of what's being seen.
   */
  private describeScene(detections: VisionDetection[]): string {
    if (detections.length === 0) {
      return 'Camera is active, no objects detected';
    }

    const labels = detections.map(d => d.label);
    return `Detected: ${labels.join(', ')}`;
  }

  /**
   * PUBLISH CUSTOM DETECTIONS
   * 
   * Allows external services (e.g., leeway API) to publish detections
   */
  async publishDetections(detections: VisionDetection[], description?: string): Promise<void> {
    await this.perceptionBus.publish({
      id: `vision_detection_${Date.now()}`,
      type: 'vision',
      source: 'VisionPublisher',
      timestamp: Date.now(),
      payload: {
        kind: 'vision',
        state: 'processing',
        frame: this.canvasElement ? {
          width: this.canvasElement.width,
          height: this.canvasElement.height,
          rotation: 0,
          format: 'rgba'
        } : undefined,
        detections,
        sceneDescription: description || this.describeScene(detections)
      }
    });
  }

  /**
   * STATE SETTER
   */
  private setState(newState: VisionState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    console.log(`[VisionPublisher] State: ${oldState} → ${newState}`);

    eventBus.emit('vision:state' as any, {
      state: newState,
      previousState: oldState,
      timestamp: Date.now()
    });
  }

  /**
   * GET STATE
   */
  getState(): VisionState {
    return this.state;
  }

  /**
   * GET STATS
   */
  getStats(): VisionStats {
    return { ...this.stats };
  }
}

// Export singleton
export const visionPublisher = VisionPublisher.getInstance();

