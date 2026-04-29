/*
LEEWAY HEADER — DO NOT REMOVE

REGION: UTIL
TAG: UTIL.MODULE.DEVELOPER_GUIDE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = developer-guide — governed module
WHY = Guide developers through writing LeeWay-compliant code and passing the admission gate
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = packages/standards/sdk/DEVELOPER_GUIDE.md
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

# LeeWay Developer Guide — Writing Compliant Code

## Full Training Course

For the complete two-week onboarding curriculum, architecture visuals, and agent society labs, read:

- ../../../LEEWAY_STANDARDS_2_WEEK_TRAINING_BOOK.md

## Quick Start

### Zero-Friction Setup (recommended)

Run this once in any repository:

```bash
npm run setup
```

What setup does automatically:
1. Verifies write permissions for governance files.
2. Installs git hooks (`pre-commit`, `post-merge`, `post-checkout`).
3. Rewrites governed files with missing LeeWay headers/metadata.
4. Runs compliance validation and writes `.leeway/setup.receipt.json`.
5. Writes runtime manifests to `.leeway/developer-runtime.json` and `.leeway/agents.manifest.json`.

After setup, developers do not need to manually patch metadata headers.

### Living Governance Mode

Run continuous monitoring so pasted code is auto-governed:

```bash
npm run watch
```

Watch mode continuously:
1. Detects file changes.
2. Auto-enforces LeeWay metadata on changed files.
3. Runs compliance checks.
4. Writes monitor state to `.leeway/live-governance-state.json`.

### Agent Lee Terminal Interaction

Developers can interact with Agent Lee directly from terminal:

```bash
npm run agentlee
```

One-shot mode:

```bash
npm run agentlee -- --prompt "make this repo compliant"
```

In interactive mode, use:
- `/help`
- `/setup`
- `/align`
- `/audit`
- `/organize`
- `/organize --approve`
- `/build-layer governance|learning|healing|discovery`
- `/template <name>`
- `/create-agent <name>`
- `/reproduce-agent <name>`
- `/redesign-agent <name>`
- `/status`
- `/exit`

Agent Lee can now:
1. Monitor the codebase continuously.
2. Keep metadata and headers compliant automatically.
3. Suggest and apply file placement corrections.
4. Provision LeeWay governance, learning, healing, and discovery layers.
5. Create, reproduce, or redesign agents on request.
6. Persist supervisor receipts in `.leeway/agentlee-supervisor.receipt.json`.

### Agent Templates

Generate compliant agent scaffolds:

```bash
npm run template -- --name task-router
```

Optional flags:
- `--region CORE|UI|UTIL|DATA`
- `--tag REGION.GROUP.NAME.MAIN`
- `--out src/agents/generated`
- `--no-contract`

Your code must pass the **LeeWay Admission Gate** before it can run.

The gate checks:
1. **Identity** — Does it have TAG, REGION, DISCOVERY_PIPELINE?
2. **Authority** — Does it acknowledge it cannot modify core layers?
3. **Agent Form** — Does it identify as an Agent Lee component?
4. **Visibility** — Does it expose receipts, health state, and audit hooks?

## Step 1: Add the LEEWAY HEADER

Every file must start with this:

\`\`\`typescript
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: UI
TAG: UI.MODULE.YOUR_NAME.MAIN
DESCRIPTION: Brief description
AUTHORITY: Your Team
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = your-module — description
WHY = Why this module exists
WHO = Your name / team
WHERE = path/to/file.ts
WHEN = 2026-04-18
HOW = How it works

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
\`\`\`

### REGION Options
- **CORE**: Infrastructure, governance, standards
- **UI**: React components, frontend surfaces
- **UTIL**: Helpers, utilities, shared code
- **DATA**: Database, storage, data access

## Step 2: Use the Templates

### For Standard Modules
Use `module-template.js`:
- Provides `ModuleMetadata`
- Shows how to emit receipts
- Demonstrates health state exposure
- Includes error handling

### For Room Projections
Use `projection-template.tsx`:
- Extends React components
- Implements governance compliance
- Shows receipt emission pattern
- Demonstrates health monitoring

## Step 3: Key Governance Rules

### ✅ DO:
- Include all required metadata
- Emit execution receipts
- Expose health state
- Use adapter patterns for core access
- Test against the admission gate
- Document your 5WH

### ❌ DON'T:
- Direct imports from `/standards` or `/runtime`
- Overwrite core layer logic
- Hide errors or failures
- Skip receipt emission
- Claim no-sovereignty awareness without acknowledging it
- Write files that will fail compliance check

## Step 4: Test Locally

### Check file compliance:
\`\`\`bash
npm run leeway:enforce:check
\`\`\`

### Fix files automatically:
\`\`\`bash
npm run leeway:enforce:fix
\`\`\`

### Test admission gate (Room only):
\`\`\`bash
npm run test:admission-gate
\`\`\`

## Step 5: Validate Your Module

Your code must pass:

1. **File-Level Compliance**
   - Header present ✓
   - TAG, REGION, DISCOVERY_PIPELINE defined ✓
   - 5WH section complete ✓

2. **Runtime Governance**
   - ModuleMetadata exported ✓
   - No forbidden imports ✓
   - Receipts emitted ✓
   - Health state exposed ✓

3. **Admission Gate (External Modules)**
   - Title is "Agent Lee — [Name]" ✓
   - acknowledgesNoSovereignty: true ✓
   - emitsReceipts: true ✓
   - exposesHealthState: true ✓
   - exposesAuditHooks: true ✓

## Common Errors & Fixes

### Error: "Module missing LEEWAY HEADER"
**Fix**: Add the header block at the top of your file

### Error: "Sovereignty boundary violation"
**Fix**: Don't import from `/runtime` or `/standards` directly
Use the adapter pattern instead

### Error: "Module does not emit receipts"
**Fix**: Call the receipt emitter after operations:
\`\`\`typescript
await auditHooks.onOperationEnd(operation);
\`\`\`

### Error: "Projection title must mount as an Agent Lee form"
**Fix**: Start your component title with "Agent Lee — "

## Developer Workflow

```
1. Run: npm run setup
2. (Optional but recommended) Run: npm run watch
3. Create new agents with: npm run template -- --name your-agent
4. Implement your logic
5. Commit normally (hooks auto-enforce + auto-check compliance)
6. Deploy with confidence
```

## Support

Questions? Check:
- `/LeeWay-Standards/contracts/construct.room-on-the-edge.contract.ts`
- `src/governance/admissionGate.ts` (Room only)
- `test-governance-loop.mjs` (examples)

---

**Remember**: The system will say NO to code that doesn't comply.

That's not a bug. That's a feature.

Write with intent. Code with governance.
