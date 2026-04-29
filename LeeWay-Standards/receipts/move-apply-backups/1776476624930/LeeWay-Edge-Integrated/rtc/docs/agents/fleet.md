# Agent Fleet & Governance

## Agent Fleet Table

| ID        | Codename   | Role               | Tier         | Tick  | Reports To |
|-----------|------------|--------------------|--------------|-------|------------|
| AGT-001   | ARIA       | Health Monitor     | core         | 30 s  | GOVERNOR   |
| AGT-002   | VECTOR     | Metrics Analyst    | core         | 15 s  | GOVERNOR   |
| AGT-003   | WARD       | Room Janitor       | core         | 60 s  | GOVERNOR   |
| AGT-004   | SENTINEL   | Security Guard     | core         | 20 s  | GOVERNOR   |
| AGT-005   | NEXUS      | Runtime Watchdog   | core         | 45 s  | GOVERNOR   |
| AGT-006   | REPAIR     | Auto-Repair        | infrastructure| 25 s  | GOVERNOR   |
| AGT-007   | GOVERNOR   | Master Governance  | oversight    | 60 s  | OPERATOR   |
| AGT-008   | SCALER     | Auto-Scaler        | infrastructure| 45 s  | GOVERNOR   |

## Governance Hierarchy

```mermaid
graph TD
  OPERATOR([👨‍💻 OPERATOR]):::op
  GOVERNOR([AGT-007 GOVERNOR]):::oversight
  ARIA([AGT-001 ARIA]):::core
  VECTOR([AGT-002 VECTOR]):::core
  WARD([AGT-003 WARD]):::core
  SENTINEL([AGT-004 SENTINEL]):::core
  NEXUS([AGT-005 NEXUS]):::core
  REPAIR([AGT-006 REPAIR]):::infra
  SCALER([AGT-008 SCALER]):::infra
  OPERATOR -->|owns| GOVERNOR
  GOVERNOR -->|audits| ARIA
  GOVERNOR -->|audits| VECTOR
  GOVERNOR -->|audits| WARD
  GOVERNOR -->|audits| SENTINEL
  GOVERNOR -->|audits| NEXUS
  GOVERNOR -->|audits| REPAIR
  GOVERNOR -->|audits| SCALER
  REPAIR -->|auto-heals| ARIA
  REPAIR -->|auto-heals| VECTOR
  REPAIR -->|auto-heals| WARD
  REPAIR -->|auto-heals| SENTINEL
  REPAIR -->|auto-heals| NEXUS
  REPAIR -->|auto-heals| SCALER
  classDef op fill:#f59e0b,color:#000;
  classDef oversight fill:#ef4444,color:#fff;
  classDef core fill:#3b82f6,color:#fff;
  classDef infra fill:#8b5cf6,color:#fff;
```

## Agent Lifecycle

```mermaid
stateDiagram-v2
  [*] --> idle : register()
  idle --> active : start()
  active --> alert : threshold breach
  active --> suspended : GOVERNOR directive / idle timeout
  alert --> active : REPAIR auto-heal / resume()
  suspended --> active : resume()
  active --> offline : stop()
  suspended --> offline : stop()
  offline --> active : REPAIR restart (non-oversight only)
  offline --> [*]
```
