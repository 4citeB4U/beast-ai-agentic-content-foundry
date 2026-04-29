/*
LEEWAY HEADER - DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: RUNTIME.ROOMSYSTEM.ADAPTER
TAG: ADAPTER.ROOMSYSTEM
WHAT = Integrated-side adapter boundary for room-system capabilities
WHY = Prevents direct ownership imports from UI/integrated entrypoints into transport-bound modules
WHO = Leeway Industries
*/

let roomSystemPromise = null;

async function loadRoomSystemModules() {
  const [auth, capabilities, rooms, admin, runtime, events] = await Promise.all([
    import("../room-system/auth.js"),
    import("../room-system/capabilities.js"),
    import("../room-system/rooms.js"),
    import("../room-system/admin.js"),
    import("../room-system/runtime.js"),
    import("../room-system/events.js"),
  ]);

  return {
    AuthEngine: auth.AuthEngine,
    CapabilityEngine: capabilities.CapabilityEngine,
    RoomEngine: rooms.RoomEngine,
    AdminEngine: admin.AdminEngine,
    RoomRuntimeManager: runtime.RoomRuntimeManager,
    RoomRuntime: runtime.RoomRuntime,
    EventEngine: events.EventEngine,
    wireEventEnforcement: events.wireEventEnforcement,
  };
}

export async function getRoomSystemAdapter() {
  if (!roomSystemPromise) {
    roomSystemPromise = loadRoomSystemModules();
  }
  return roomSystemPromise;
}
