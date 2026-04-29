/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: UI.VISION.OVERLAY.RENDERER.MAIN
REGION: 🔵 UI
PURPOSE:
Enhance the existing VisionPerceptionLab overlay canvas to render visible detection boxes.
Reference code: src/components/VisionPerceptionLab.tsx (overlay drawing in monitor loop + scan handler)

CURRENT STATE:
- overlayCanvasRef exists
- Simple HUD bars drawn (brightness, motion)
- "Face Detected" text only
- No visible bounding boxes
- No text region markers

PROBLEM:
User cannot see what the AI is detecting because there are no boxes/regions drawn.

SOLUTION:
Enhance the existing overlay drawing logic to render:
1. Face bounding boxes on overlay canvas
2. Text region bounding boxes on overlay canvas
3. Scan focus regions
4. Optional measurement labels
5. Confidence badges

INTEGRATION POINT:
Line ~160-205 in VisionPerceptionLab.tsx (monitor loop canvas drawing):
Currently:
  ctx.fillRect(10, 10, state.brightness * 80, 15);  // brightness bar
Replace/Enhance with:
  drawFaceBoxes(ctx, scanOutput.faceBox);  // NEW
  drawTextRegions(ctx, scanOutput.textRegions);  // NEW
  drawHUDPanel(ctx, state);  // EXISTING, refactored

DATA SOURCES (already computed):
- scanOutput.faceBox = [x, y, w, h]
- scanOutput.textRegions = [[x, y, w, h], ...]
- scanOutput.sceneTags = [...]
- inspectOutput.eyeOpenness = number
- currentPacket.readings = [...]

IMPLEMENTATION REQUIREMENTS:

1. Create a VisualOverlayRenderer class/module that exposes:
   - drawContext(canvas, canvasCtx)
   - drawFaceBox(faceBox, confidence)
   - drawTextRegions(textRegions, confidences)
   - drawScanRegion(region)
   - drawOCRLabel(region, text)
   - drawHUDPanel(state)

2. For each detection type, render:

   FACE BOX:
   - line style: green or cyan, 2-3px width
   - label: "Face" + confidence % nearby
   - optional: head tilt angle indicator
   - example: rect(x, y, w, h) with label "Face 0.97"

   TEXT REGION BOXES:
   - line style: yellow or orange, 2px width
   - label: "Text" or OCR preview if available
   - example: rect(x, y, w, h) with truncated text overlay

   SCAN FOCUS:
   - subtle border highlight around active region in inspect mode

3. Integrate with existing handlers:

   In monitor loop (line ~150):
   - Get latest scanOutput from visionScanner
   - Call renderer.drawFaceBox() + drawTextRegions()

   In scan handler (line ~210):
   - After visionScanner.scan() completes
   - Pass scanOutput.faceBox + scanOutput.textRegions to renderer
   - Draw on overlay canvas immediately

4. Canvas setup:
   - overlayCanvasRef must match video canvas dimensions
   - Clear overlay each frame: ctx.clearRect(0, 0, w, h)
   - Draw latest detections on top

5. Font/style requirements:
   - Readable small font (10-12px monospace)
   - Labels near boxes, not covering center
   - Color scheme (suggest):
     * Face: cyan #00FFD1 or green #00FF00
     * Text: yellow #FFFF00 or orange #FFA500
     * Scan focus: purple #9F7AEA or magenta

TESTING CRITERIA:
- Face box visible when face detected
- Text boxes visible when text regions found
- Labels readable and positioned well
- Overlay updates in real-time during monitor
- Overlay persists during scan result display
- No performance regression

SUCCESS:
User can now see exactly where the AI is looking and what regions it's analyzing.
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

export interface MonitorState {
  brightness: number;
  motion: number;
  facePresent: boolean;
}

export class VisualOverlayRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  // Clear the overlay
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Draw face box
  drawFaceBox(faceBox: { x: number; y: number; w: number; h: number } | null, confidence: number = 0.9) {
    if (!faceBox) return;

    const { x, y, w, h } = faceBox;
    const color = confidence > 0.85 ? '#00FFD1' : '#FFAA00';
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x, y, w, h);

    // Label
    this.ctx.fillStyle = color;
    this.ctx.font = '11px monospace';
    const label = `Face ${(confidence * 100 | 0)}%`;
    this.ctx.fillText(label, x, y - 5);
  }

  // Draw text regions
  drawTextRegions(textRegions: Array<{ x: number; y: number; w: number; h: number }>, confidences: number[] = []) {
    textRegions.forEach((region, idx) => {
      const { x, y, w, h } = region;
      this.ctx.strokeStyle = '#FFFF00';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, w, h);

      // Label
      this.ctx.fillStyle = '#FFFF00';
      this.ctx.font = '10px monospace';
      this.ctx.fillText('Text', x + 2, y + 12);
    });
  }

  // Draw scan region (for focus)
  drawScanRegion(region: { x: number; y: number; w: number; h: number }) {
    const { x, y, w, h } = region;
    this.ctx.strokeStyle = '#9F7AEA';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.setLineDash([]);
  }

  // Draw OCR label
  drawOCRLabel(region: { x: number; y: number; w: number; h: number }, text: string) {
    const { x, y, w, h } = region;
    this.ctx.fillStyle = '#FFA500';
    this.ctx.font = '10px monospace';
    const truncated = text.length > 10 ? text.substring(0, 10) + '...' : text;
    this.ctx.fillText(truncated, x + 2, y + h - 2);
  }

  // Draw HUD panel (existing logic)
  drawHUDPanel(state: MonitorState) {
    // Brightness bar (top-left)
    this.ctx.fillStyle = `rgba(${Math.round(state.brightness * 255)}, 150, 100, 0.8)`;
    this.ctx.fillRect(10, 10, state.brightness * 80, 15);
    this.ctx.fillStyle = 'white';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Brightness: ${(state.brightness * 100).toFixed(0)}%`, 10, 30);

    // Motion indicator (top-right)
    this.ctx.fillStyle = state.motion > 0.5 ? 'rgba(255, 100, 100, 0.8)' : 'rgba(100, 200, 100, 0.8)';
    this.ctx.fillRect(220, 10, state.motion * 80, 15);
    this.ctx.fillStyle = 'white';
    this.ctx.fillText(`Motion: ${(state.motion * 100).toFixed(0)}%`, 220, 30);

    // Face presence (bottom-left)
    if (state.facePresent) {
      this.ctx.fillStyle = 'rgba(100, 255, 100, 0.8)';
      this.ctx.fillRect(10, this.canvas.height - 30, 200, 20);
      this.ctx.fillStyle = 'black';
      this.ctx.fillText('Face Detected', 15, this.canvas.height - 13);
    }
  }

  // Draw measurement labels (for inspect mode)
  drawMeasurementLabels(inspectOutput: InspectOutput, faceBox: { x: number; y: number; w: number; h: number } | null) {
    if (!faceBox) return;

    const { x, y, w } = faceBox;
    const rightEdge = x + w + 10;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '10px monospace';
    this.ctx.fillText(`EYE: ${(inspectOutput.eyeOpenness * 100 | 0)}%`, rightEdge, y);
    this.ctx.fillText(`TILT: ${inspectOutput.headTiltDeg.toFixed(1)}°`, rightEdge, y + 12);
    this.ctx.fillText(`CLUTTER: ${(inspectOutput.clutter * 100 | 0)}%`, rightEdge, y + 24);
  }
}