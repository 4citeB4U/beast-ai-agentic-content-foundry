# Developer Guide

## Tech Stack

- React 19
- TypeScript 5
- Vite 6
- Tailwind CSS v4
- Framer Motion (`motion`)

## Project Layout

- `src/`: Main application UI and logic
- `public/`: Generated runtime manifests and static assets
- `scripts/`: Build-time and governance/runtime generation scripts
- `governance/`: Product governance profiles
- `LeeWay-Standards/`: Leeway policy/runtime tooling

## Runtime Manifests

Two generated manifests are important for runtime behavior:

1. `public/leeway-hivemind.json`
2. `public/platform-api-skills.json`

Generation commands:

```bash
npm run hivemind:sync
npm run platform:skills
```

## Build and Verification

```bash
npm run build
```

The build command runs:

1. HiveMind sync
2. Platform skills sync
3. Brand gate check
4. Vite build

## Environment Variables

- `GEMINI_API_KEY`: API key for creative model lane
- `VITE_AGENTLEE_AI_MODE`: `auto`, `hivemind`, or `gemini`

## CI Behavior

GitHub Actions runs `npm run build` on pushes and pull requests to `main`.

Notes:

- `scripts/sync-leeway-hivemind.mjs` is resilient when external source folders do not exist.
- CI will still generate a valid manifest with reduced source availability metadata.

## Contribution Flow

1. Create feature branch.
2. Implement and run local build.
3. Open pull request to `main`.
4. Ensure CI build is green.
5. Merge after review.
