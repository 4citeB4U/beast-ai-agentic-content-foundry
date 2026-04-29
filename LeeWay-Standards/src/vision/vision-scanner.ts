/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: AI.VISION.SCANNER.DETECTION.MAIN
REGION: 🧠 AI
DISCOVERY_PIPELINE:
Voice → Intent → Scan Request → Frame Capture → Detection → Output

PURPOSE:
Add a controlled, on-demand scan layer that detects regions of interest using minimal compute.

CONSTRAINTS:
- Must run only when triggered
- Must respect governance and runtime mode
- Must not introduce independent scheduling

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { RuntimeMode } from './types';

export interface ScanOutput {
  ts: number;
  frameId: string;
  faceBox: { x: number; y: number; w: number; h: number } | null;
  textRegions: Array<{ x: number; y: number; w: number; h: number }>;
  sceneTags: string[];
  bodyPresent: boolean;
  scanConfidence: number;
  runtimeMode: RuntimeMode;
}

class VisionScanner {
  private canvas: OffscreenCanvas | null = null;
  private ctx: OffscreenCanvasRenderingContext2D | null = null;
  private frameCounter = 0;

  async initialize(): Promise<void> {
    this.canvas = new OffscreenCanvas(480, 360);
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('Failed to get scanner canvas context');
  }

  async scan(
    videoElement: HTMLVideoElement,
    runtimeMode: RuntimeMode
  ): Promise<ScanOutput> {
    if (!this.ctx) throw new Error('Scanner not initialized');

    this.ctx.drawImage(videoElement, 0, 0, 480, 360);
    const frameData = this.ctx.getImageData(0, 0, 480, 360);

    const frameId = `scan-${Date.now()}-${this.frameCounter++}`;

    // Ultra-light mode: face + text regions only
    // Balanced mode: add scene tags
    // Full mode: allow improved confidence scoring

    const faceBox = this.detectFaceBox(frameData);
    const textRegions = this.detectTextRegions(frameData);
    const sceneTags =
      runtimeMode !== 'ultra-light' ? this.detectSceneTags(frameData) : [];
    const bodyPresent = runtimeMode === 'full' ? this.detectBodyPresence(frameData) : false;

    const scanConfidence = 0.75 + (runtimeMode === 'full' ? 0.15 : 0);

    return {
      ts: Date.now(),
      frameId,
      faceBox,
      textRegions,
      sceneTags,
      bodyPresent,
      scanConfidence,
      runtimeMode,
    };
  }

  private detectFaceBox(frameData: ImageData): { x: number; y: number; w: number; h: number } | null {
    // Simplified face detection using edge detection
    const edges = this.detectEdges(frameData);
    const width = frameData.width;
    const height = frameData.height;

    let maxCluster = { x: 0, y: 0, size: 0 };
    let clusterSize = 0;

    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > 50) {
        clusterSize++;
        if (clusterSize > maxCluster.size) {
          maxCluster.size = clusterSize;
          maxCluster.x = i % width;
          maxCluster.y = Math.floor(i / width);
        }
      }
    }

    if (maxCluster.size > 100) {
      return {
        x: Math.max(0, maxCluster.x - 60),
        y: Math.max(0, maxCluster.y - 60),
        w: 120,
        h: 150,
      };
    }

    return null;
  }

  private detectTextRegions(frameData: ImageData): Array<{ x: number; y: number; w: number; h: number }> {
    // Rule-based text region detection
    const regions: Array<{ x: number; y: number; w: number; h: number }> = [];
    const width = frameData.width;
    const height = frameData.height;

    // Detect high-contrast areas (potential text)
    for (let y = 0; y < height - 40; y += 40) {
      for (let x = 0; x < width - 60; x += 60) {
        let contrast = 0;
        for (let dy = 0; dy < 40; dy++) {
          for (let dx = 0; dx < 60; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const lum = (frameData.data[idx] + frameData.data[idx + 1] + frameData.data[idx + 2]) / 3;
            contrast += Math.abs(lum - 128);
          }
        }

        if (contrast > 5000) {
          regions.push({ x, y, w: 60, h: 40 });
        }
      }
    }

    return regions;
  }

  private detectSceneTags(frameData: ImageData): string[] {
    const tags: string[] = [];
    const brightness = this.computeBrightnessQuick(frameData);

    if (brightness < 0.3) tags.push('dark');
    else if (brightness > 0.7) tags.push('bright');
    else tags.push('indoor');

    // Color dominance
    const colors = this.analyzeColorDominance(frameData);
    if (colors.blue > colors.red && colors.blue > colors.green) tags.push('blue-tint');
    if (colors.red > colors.blue && colors.red > colors.green) tags.push('red-tint');

    return tags;
  }

  private detectBodyPresence(frameData: ImageData): boolean {
    // Detect large clustered regions (body silhouette)
    const data = frameData.data;
    let bodyPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skin or clothing colors
      if ((r > g && r > b) || (g > 100 && b > 100)) {
        bodyPixels++;
      }
    }

    return bodyPixels > frameData.width * frameData.height * 0.1;
  }

  private detectEdges(frameData: ImageData): number[] {
    const data = frameData.data;
    const width = frameData.width;
    const height = frameData.height;
    const edges: number[] = new Array(data.length / 4).fill(0);

    for (let i = 1; i < width * height - 1; i++) {
      const idx = i * 4;
      const current = data[idx];
      const right = data[(i + 1) * 4];
      const below = data[(i + width) * 4];
      edges[i] = Math.abs(current - right) + Math.abs(current - below);
    }

    return edges;
  }

  private computeBrightnessQuick(frameData: ImageData): number {
    const data = frameData.data;
    let sum = 0;
    for (let i = 0; i < Math.min(data.length, 10000); i += 4) {
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    return sum / (Math.min(data.length / 4, 2500)) / 255;
  }

  private analyzeColorDominance(frameData: ImageData): { red: number; green: number; blue: number } {
    const data = frameData.data;
    let red = 0,
      green = 0,
      blue = 0;

    for (let i = 0; i < data.length; i += 4) {
      red += data[i];
      green += data[i + 1];
      blue += data[i + 2];
    }

    const samples = data.length / 4;
    return {
      red: red / samples,
      green: green / samples,
      blue: blue / samples,
    };
  }
}

export default new VisionScanner();
