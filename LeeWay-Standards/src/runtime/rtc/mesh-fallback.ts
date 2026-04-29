/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
TAG: MCP.RTC.MESH.FALLBACK
REGION: 🟣 MCP
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export class MeshFallback {
  pc: RTCPeerConnection;

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [] // no STUN = local network / offline only
    });
  }

  async start(stream: MediaStream) {
    stream.getTracks().forEach(track => {
      this.pc.addTrack(track, stream);
    });
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async acceptOffer(offer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(offer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async acceptAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer);
  }

  onTrack(cb: (stream: MediaStream) => void) {
    this.pc.ontrack = e => cb(e.streams[0]);
  }
}

export function shouldFallback(rtcState: any) {
  return (
    rtcState.connectionState === 'failed' ||
    rtcState.iceState === 'failed' ||
    (rtcState.isRelay === false && rtcState.rtt > 800)
  );
}

export async function handleFallback(rtcState: any, mesh: MeshFallback) {
  if (shouldFallback(rtcState)) {
    console.warn('Switching to mesh mode...');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await mesh.start(stream);
  }
}
