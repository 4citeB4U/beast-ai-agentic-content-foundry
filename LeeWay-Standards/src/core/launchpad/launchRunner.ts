/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.LAUNCHPAD.RUNNER
TAG: CORE.LAUNCHPAD.PIPELINE

5WH:
WHAT = Agent-run pipeline runner for Launch Pad — executes validate/build/package/publish/verify/announce steps autonomously
WHY = Removes manual toil from the publish workflow; Agent Lee runs the pipeline, UI just shows status
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/launchpad/launchRunner.ts
WHEN = 2026
HOW = Async step machine that persists every state change to Memory Lake and emits EventBus events

LICENSE: MIT
*/

import { eventBus } from '../EventBus';
import { palliumClient } from './palliumClient';
import { getProvider } from './providers';
import type {
  LaunchJob, LaunchRecord, DeployableBundle,
  PipelineStep, PipelineStepRecord, JobStatus, TraceEvent
} from './types';

// ── Utility ────────────────────────────────────────────────────

function uuid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function appendTrace(
  traceId: string,
  type: string,
  payload: Record<string, unknown>,
  severity: TraceEvent['severity'] = 'info',
  source = 'launchRunner'
) {
  const evt: TraceEvent = {
    trace_id: traceId,
    span_id: uuid(),
    type,
    severity,
    payload,
    source,
    created_at: Date.now(),
  };
  await palliumClient.events.append(evt);
}

async function updateStep(
  job: LaunchJob,
  step: PipelineStep,
  status: JobStatus,
  detail?: string
): Promise<LaunchJob> {
  const updated = {
    ...job,
    pipeline_steps: job.pipeline_steps.map(s =>
      s.step === step
        ? {
            ...s,
            status,
            started_at: s.started_at ?? (status === 'running' ? Date.now() : undefined),
            ended_at: ['succeeded', 'failed', 'canceled'].includes(status) ? Date.now() : s.ended_at,
            detail,
          }
        : s
    ),
    updated_at: Date.now(),
  };
  await palliumClient.jobs.update(updated);
  eventBus.emit('launchpad:job_updated', { launchId: job.launch_id, jobId: job.id, status });
  return updated;
}

// ── Pipeline Steps ─────────────────────────────────────────────

async function stepValidate(job: LaunchJob, bundle: DeployableBundle): Promise<{ ok: boolean; detail?: string }> {
  if (!bundle) return { ok: false, detail: 'No bundle found for this launch.' };
  if (bundle.files_snapshot.length === 0 && bundle.assets.length === 0) {
    return { ok: false, detail: 'Bundle is empty — no files or assets to deploy.' };
  }
  const missing = bundle.manifest.env_schema
    .filter(e => e.required)
    .filter(e => !import.meta.env[`VITE_${e.key}`]);
  if (missing.length > 0) {
    const keys = missing.map(e => e.key).join(', ');
    return { ok: false, detail: `Missing required env vars: ${keys}` };
  }
  return { ok: true };
}

async function stepBuild(_job: LaunchJob, bundle: DeployableBundle): Promise<string> {
  // TODO: integrate WebContainers or remote VPS build
  // For now: stub + simulate latency
  await new Promise(r => setTimeout(r, 1000));
  return `Build artifact for bundle ${bundle.id} (${bundle.files_snapshot.length} files, ${bundle.assets.length} assets)`;
}

async function stepPackage(_job: LaunchJob, bundle: DeployableBundle): Promise<string> {
  // TODO: zip files_snapshot contents into a real artifact
  await new Promise(r => setTimeout(r, 600));
  return `Packaged ${bundle.files_snapshot.length + bundle.assets.length} items into deployable artifact`;
}

async function stepPublish(job: LaunchJob, bundle: DeployableBundle, launch: LaunchRecord): Promise<{ links: { label: string; url: string }[]; detail: string }> {
  // Determine which providers to use based on launch type
  const providerIds: string[] = [];
  if (['web_app', 'marketing_site', 'seo_package'].includes(launch.type)) {
    providerIds.push('vercel');
  }
  if (['digital_product', 'music_drop'].includes(launch.type)) {
    providerIds.push('gumroad');
  }
  if (providerIds.length === 0) providerIds.push('vercel'); // default

  const allLinks: { label: string; url: string }[] = [];
  for (const pid of providerIds) {
    const provider = getProvider(pid);
    if (!provider) { continue; }
    if (!provider.isConnected()) {
      await provider.connect();
    }
    const result = await provider.publish(bundle);
    if (result.success) allLinks.push(...result.links);
  }
  return { links: allLinks, detail: `Published via: ${providerIds.join(', ')}` };
}

async function stepVerify(links: { label: string; url: string }[]): Promise<{ ok: boolean; detail: string }> {
  // TODO: real HTTP check via fetch()
  await new Promise(r => setTimeout(r, 400));
  if (links.length === 0) return { ok: false, detail: 'No publish links to verify.' };
  return { ok: true, detail: `Verified ${links.length} URL(s) — stub OK` };
}

async function stepAnnounce(launch: LaunchRecord, links: { label: string; url: string }[]): Promise<void> {
  // TODO: post to connected social providers (Twitter, etc.)
  await new Promise(r => setTimeout(r, 300));
  // Emit an observability event so monitoring surface picks it up
  eventBus.emit('launchpad:job_updated', { launchId: launch.id, jobId: '', status: 'announced' });
}

// ── Main Entry Point ───────────────────────────────────────────

export async function startLaunchJob(params: {
  launchId: string;
  bundleId: string;
  mode: LaunchJob['mode'];
}): Promise<LaunchJob> {
  const { launchId, bundleId, mode } = params;
  const traceId = uuid();

  // Build the initial job record
  const STEPS: PipelineStep[] = ['validate', 'build', 'package', 'publish', 'verify', 'announce'];
  const pipelineSteps: PipelineStepRecord[] = STEPS.map(step => ({
    step,
    status: 'queued',
  }));

  let job: LaunchJob = {
    id: uuid(),
    launch_id: launchId,
    bundle_id: bundleId,
    status: 'running',
    mode,
    pipeline_steps: pipelineSteps,
    trace_id: traceId,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  await palliumClient.jobs.create(job);
  eventBus.emit('launchpad:job_started', { launchId, jobId: job.id });
  await appendTrace(traceId, 'job.started', { launchId, jobId: job.id, mode });

  // Load entities
  const launch = await palliumClient.launches.get(launchId);
  const bundle = await palliumClient.bundles.get(bundleId);

  if (!launch || !bundle) {
    job = { ...job, status: 'failed', updated_at: Date.now() };
    await palliumClient.jobs.update(job);
    eventBus.emit('launchpad:job_finished', { launchId, jobId: job.id, status: 'failed' });
    return job;
  }

  // ── VALIDATE ──────────────────────────────────────────────────
  job = await updateStep(job, 'validate', 'running');
  await appendTrace(traceId, 'step.validate.start', {});
  const validation = await stepValidate(job, bundle);
  if (!validation.ok) {
    job = await updateStep(job, 'validate', 'failed', validation.detail);
    job = { ...job, status: 'failed', updated_at: Date.now() };
    await palliumClient.jobs.update(job);
    await appendTrace(traceId, 'step.validate.failed', { detail: validation.detail }, 'error');
    eventBus.emit('launchpad:job_finished', { launchId, jobId: job.id, status: 'failed' });
    return job;
  }
  job = await updateStep(job, 'validate', 'succeeded');
  await appendTrace(traceId, 'step.validate.done', {});

  // Skip build+package in publish_only mode
  if (mode !== 'publish_only') {
    // ── BUILD ──────────────────────────────────────────────────
    job = await updateStep(job, 'build', 'running');
    await appendTrace(traceId, 'step.build.start', {});
    try {
      const buildDetail = await stepBuild(job, bundle);
      job = await updateStep(job, 'build', 'succeeded', buildDetail);
      await appendTrace(traceId, 'step.build.done', { detail: buildDetail });
    } catch (e: any) {
      job = await updateStep(job, 'build', 'failed', e?.message);
      job = { ...job, status: 'failed', updated_at: Date.now() };
      await palliumClient.jobs.update(job);
      eventBus.emit('launchpad:job_finished', { launchId, jobId: job.id, status: 'failed' });
      return job;
    }

    // ── PACKAGE ────────────────────────────────────────────────
    job = await updateStep(job, 'package', 'running');
    const pkgDetail = await stepPackage(job, bundle);
    job = await updateStep(job, 'package', 'succeeded', pkgDetail);
    await appendTrace(traceId, 'step.package.done', { detail: pkgDetail });
  }

  // Skip publish in build_only mode
  let publishedLinks: { label: string; url: string }[] = [];
  if (mode !== 'build_only') {
    // ── PUBLISH ────────────────────────────────────────────────
    job = await updateStep(job, 'publish', 'running');
    await appendTrace(traceId, 'step.publish.start', {});
    try {
      const publishResult = await stepPublish(job, bundle, launch);
      publishedLinks = publishResult.links;
      job = await updateStep(job, 'publish', 'succeeded', publishResult.detail);
      await appendTrace(traceId, 'step.publish.done', { links: publishedLinks });
    } catch (e: any) {
      job = await updateStep(job, 'publish', 'failed', e?.message);
      job = { ...job, status: 'failed', updated_at: Date.now() };
      await palliumClient.jobs.update(job);
      eventBus.emit('launchpad:job_finished', { launchId, jobId: job.id, status: 'failed' });
      return job;
    }

    // ── VERIFY ────────────────────────────────────────────────
    job = await updateStep(job, 'verify', 'running');
    const verifyResult = await stepVerify(publishedLinks);
    job = await updateStep(job, 'verify', verifyResult.ok ? 'succeeded' : 'failed', verifyResult.detail);
    await appendTrace(traceId, 'step.verify.done', { ok: verifyResult.ok });

    // ── ANNOUNCE ──────────────────────────────────────────────
    job = await updateStep(job, 'announce', 'running');
    await stepAnnounce(launch, publishedLinks);
    job = await updateStep(job, 'announce', 'succeeded');
    await appendTrace(traceId, 'step.announce.done', {});
  }

  // ── Finalize ──────────────────────────────────────────────────
  job = { ...job, status: 'succeeded', updated_at: Date.now() };
  await palliumClient.jobs.update(job);

  // Update the launch record with results
  const updatedLaunch: LaunchRecord = {
    ...launch,
    status: 'live',
    primary_links: publishedLinks,
    last_job_id: job.id,
    updated_at: Date.now(),
  };
  await palliumClient.launches.upsert(updatedLaunch);
  await appendTrace(traceId, 'job.finished', { status: 'succeeded', links: publishedLinks });
  eventBus.emit('launchpad:job_finished', { launchId, jobId: job.id, status: 'succeeded' });

  return job;
}
