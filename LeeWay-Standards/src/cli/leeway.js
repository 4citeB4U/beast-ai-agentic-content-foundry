#!/usr/bin/env node
/**
 * LEEWAY HEADER
 * TAG: CORE.CLI.LEEWAY.MAIN
 * REGION: CORE
 * PURPOSE: Primary LeeWay CLI entrypoint
 *
 * DISCOVERY_PIPELINE:
 * Voice -> Intent -> CLI -> Governance -> Runtime -> Render
 *
 * 5WH:
 * WHAT = LeeWay CLI entrypoint
 * WHY = Provide stable command entry for runtime and compliance
 * WHO = LeeWay Standards
 * WHERE = src/cli/leeway.js
 * WHEN = 2026-04-21
 * HOW = Dispatch command verbs to runtime and governance scripts
 */

import process from "node:process";

async function main() {
  const [, , command = "help", ...args] = process.argv;

  switch (command) {
    case "start": {
      const { startLeeway } = await import("../runtime/index.js");
      await startLeeway({ args });
      break;
    }

    case "compliance": {
      const { runComplianceCheck } = await import("../../scripts/compliance-check.mjs");
      const result = await runComplianceCheck(process.cwd());
      process.exit(result.ok ? 0 : 1);
      break;
    }

    case "help":
    default:
      console.log(
        [
          "LeeWay CLI",
          "",
          "Commands:",
          "  leeway start",
          "  leeway compliance",
          "  leeway help",
        ].join("\n"),
      );
      break;
  }
}

main().catch((error) => {
  console.error("[LEEWAY_CLI_FATAL]", error);
  process.exit(1);
});
