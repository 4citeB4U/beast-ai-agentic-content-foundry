/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.PROTOCOL_ROUTER.MAIN
DESCRIPTION: Workflow protocol router for sovereign cycle dispatch.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: PROPRIETARY
*/

export type WorkflowProtocol = 'VOICE' | 'TEXT' | 'VISION' | 'HYBRID';

export function routeWorkflowProtocol(input: {
  hasAudio?: boolean;
  hasVision?: boolean;
  hasText?: boolean;
}): WorkflowProtocol {
  const audio = !!input.hasAudio;
  const vision = !!input.hasVision;
  const text = !!input.hasText;

  if ((audio || text) && vision) return 'HYBRID';
  if (audio) return 'VOICE';
  if (vision) return 'VISION';
  return 'TEXT';
}
