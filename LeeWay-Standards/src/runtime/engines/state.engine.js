/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.STATE
TAG: ENGINE.STATE
WHAT = Central runtime state engine for rooms, workers, tasks, and telemetry
WHY = Publishes live runtime state for UI and orchestration
WHO = Leeway Industries
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export const ENGINE_SIGNATURE = 'STATE_ENGINE::LEEWAY_V1';

const runtimeState = {
  rooms: {},
  workers: {},
  tasks: {},
  rtc: {
    status: 'offline',
    lastUpdate: null,
    health: 'unknown',
  },
  diagnostics: [],
};

const subscribers = new Set();

function publish() {
  subscribers.forEach(fn => {
    try {
      fn({ ...runtimeState });
    } catch (error) {
      console.warn('[StateEngine] subscriber error', error);
    }
  });
}

export const StateEngine = {
  getState() {
    return { ...runtimeState };
  },

  subscribe(fn) {
    subscribers.add(fn);
    fn({ ...runtimeState });
    return () => subscribers.delete(fn);
  },

  updateRoom(roomId, roomPatch) {
    const previous = runtimeState.rooms[roomId] || { id: roomId, createdAt: new Date().toISOString() };
    runtimeState.rooms[roomId] = { ...previous, ...roomPatch };
    runtimeState.rooms[roomId].updatedAt = new Date().toISOString();
    publish();
    return runtimeState.rooms[roomId];
  },

  updateWorker(workerId, workerPatch) {
    const previous = runtimeState.workers[workerId] || { id: workerId, createdAt: new Date().toISOString() };
    runtimeState.workers[workerId] = { ...previous, ...workerPatch };
    runtimeState.workers[workerId].updatedAt = new Date().toISOString();
    publish();
    return runtimeState.workers[workerId];
  },

  updateTask(taskId, taskPatch) {
    const previous = runtimeState.tasks[taskId] || { id: taskId, createdAt: new Date().toISOString() };
    runtimeState.tasks[taskId] = { ...previous, ...taskPatch };
    runtimeState.tasks[taskId].updatedAt = new Date().toISOString();
    publish();
    return runtimeState.tasks[taskId];
  },

  updateRtcStatus(statusPatch) {
    runtimeState.rtc = { ...runtimeState.rtc, ...statusPatch, lastUpdate: new Date().toISOString() };
    publish();
    return runtimeState.rtc;
  },

  addDiagnostic(entry) {
    runtimeState.diagnostics.unshift({ ...entry, timestamp: new Date().toISOString() });
    if (runtimeState.diagnostics.length > 100) {
      runtimeState.diagnostics.length = 100;
    }
    publish();
    return runtimeState.diagnostics[0];
  },
};
