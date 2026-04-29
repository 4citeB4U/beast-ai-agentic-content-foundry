/*
LEEWAY HEADER — DO NOT REMOVE
AUTHORITY: LeeWay-Standards

TAG: AI.VISION.INSPECT.SIGNAL.EXTRACTION
REGION: 🧠 AI
DISCOVERY_PIPELINE:
Voice → Intent → Inspect → Region Crop → Signal Extraction → Output

PURPOSE:
Provide a deeper, single-frame analysis using only detected regions.

CONSTRAINTS:
- Must process only cropped regions
- Must not run continuously
- Must remain governed by runtime mode

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { RuntimeMode } from './types';
import type { ScanOutput } from './vision-scanner';

export interface InspectOutput {
  ts: number;
  frameId: string;
  ocr: string;
  eyeOpenness: number;
  mouthOpenness: number;
  headTiltDeg: number;
  clutter: number;
  inspectConfidence: number;
}

class VisionInspect {
  async inspect(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    scanOutput: ScanOutput,
    runtimeMode: RuntimeMode
  ): Promise<InspectOutput> {
    const ctx =
      canvas instanceof OffscreenCanvas
        ? canvas.getContext('2d')
        : (canvas as HTMLCanvasElement).getContext('2d');

    if (!ctx) throw new Error('Failed to get inspect canvas context');

    // Ultra-light mode: OCR only
    // Balanced mode: OCR + basic face cues
    // Full mode: full cue extraction

    let ocr = '';
    if (runtimeMode !== 'ultra-light' && scanOutput.textRegions.length > 0) {
      ocr = await this.extractTextFromRegions(canvas, scanOutput.textRegions);
    }

    let eyeOpenness = 0;
    let mouthOpenness = 0;
    let headTiltDeg = 0;

    if (runtimeMode !== 'ultra-light' && scanOutput.faceBox) {
      const faceSignals = this.extractFaceSignals(canvas, scanOutput.faceBox);
      eyeOpenness = faceSignals.eyeOpenness;
      mouthOpenness = faceSignals.mouthOpenness;
      headTiltDeg = faceSignals.headTilt;
    }

    const clutter = this.computeClutter(canvas);
    const confidence =
      runtimeMode === 'full' ? 0.85 : runtimeMode === 'balanced' ? 0.75 : 0.65;

    return {
      ts: Date.now(),
      frameId: scanOutput.frameId,
      ocr,
      eyeOpenness,
      mouthOpenness,
      headTiltDeg,
      clutter,
      inspectConfidence: confidence,
    };
  }

  private async extractTextFromRegions(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    regions: Array<{ x: number; y: number; w: number; h: number }>
  ): Promise<string> {
    // Placeholder OCR (would use Tesseract.js in production)
    // For now, return empty string
    return '';
  }

  private extractFaceSignals(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    faceBox: { x: number; y: number; w: number; h: number }
  ): { eyeOpenness: number; mouthOpenness: number; headTilt: number } {
    const ctx =
      canvas instanceof OffscreenCanvas
        ? canvas.getContext('2d')
        : (canvas as HTMLCanvasElement).getContext('2d');

    if (!ctx) {
      return { eyeOpenness: 0.5, mouthOpenness: 0.5, headTilt: 0 };
    }

    // Simplified eye/mouth openness based on brightness variation
    const imageData = ctx.getImageData(
      faceBox.x,
      faceBox.y,
      faceBox.w,
      faceBox.h
    );
    const data = imageData.data;

    let darkPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (lum < 80) darkPixels++;
    }

    const darkRatio = darkPixels / (faceBox.w * faceBox.h);
    const eyeOpenness = Math.min(darkRatio * 2, 1);

    // Simple head tilt detection (symmetry analysis)
    const leftSum = this.sumRegion(
      imageData,
      0,
      0,
      faceBox.w / 2,
      faceBox.h
    );
    const rightSum = this.sumRegion(
      imageData,
      faceBox.w / 2,
      0,
      faceBox.w / 2,
      faceBox.h
    );
    const asymmetry = Math.abs(leftSum - rightSum) / (leftSum + rightSum);
    const headTilt = asymmetry * 45; // Max 45 degrees

    return {
      eyeOpenness,
      mouthOpenness: Math.max(0, darkRatio - 0.1),
      headTilt,
    };
  }

  private sumRegion(
    imageData: ImageData,
    x: number,
    y: number,
    w: number,
    h: number
  ): number {
    let sum = 0;
    const data = imageData.data;
    const imageWidth = imageData.width;

    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const idx = (py * imageWidth + px) * 4;
        sum += data[idx];
      }
    }

    return sum;
  }

  private computeClutter(canvas: OffscreenCanvas | HTMLCanvasElement): number {
    const ctx =
      canvas instanceof OffscreenCanvas
        ? canvas.getContext('2d')
        : (canvas as HTMLCanvasElement).getContext('2d');

    if (!ctx) return 0.5;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Clutter = color variation / complexity
    let variance = 0;
    const mean = 128;

    for (let i = 0; i < data.length; i += 4) {
      const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
      variance += Math.pow(lum - mean, 2);
    }

    return Math.min(variance / (imageData.width * imageData.height) / 5000, 1);
  }
}

export default new VisionInspect();
