/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.GPU
TAG: ADAPTER.GPU
WHAT = GPU adapter for the Integrated motherboard shell
WHY = Wraps the GPU compute task API behind a stable runtime adapter
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { initGPU } from '../gpu/core/gpu.bootstrap.js';
import { executeGPU } from '../gpu/control/gpu.controller.bridge.js';
import { prepareMatMulTask } from '../gpu/dispatch/compute.dispatch.js';
import { ENGINE_SIGNATURES } from './signature.engine.js';
import { LeewayIntegrity } from './leeway.integrity.js';

export class GpuAdapter {
  static signature = ENGINE_SIGNATURES.gpu;

  static async initialize() {
    return initGPU();
  }

  static prepareMatMulTask(device, matA, matB, size) {
    return prepareMatMulTask(device, matA, matB, size);
  }

  static async execute(task, controller, context = {}) {
    const { audit } = context;

    await LeewayIntegrity.verifyEngine('gpu', this.signature, audit);

    const { pallium } = context;
    const vectorDB = pallium?.getDB('vector');
    console.log('GPU using vectorDB', vectorDB);
    return executeGPU(task, controller);
  }

  static async shutdown(roomId) {
    return this._shutdown?.(roomId);
  }
}
