#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.FIX_SHEBANGS.MAIN
DESCRIPTION: Repairs shebang order so executable scripts remain parseable by Node
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = fix-shebangs — repair script
WHY = Ensure #!/usr/bin/env node is always line 1 for executable scripts
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/fix-shebangs.mjs
WHEN = 2026-04-21
HOW = Move shebang to first line when found below headers

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET_DIRS = ["scripts", "src"];
const SCRIPT_EXTS = new Set([".js", ".mjs", ".cjs"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function fixShebang(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("#!/usr/bin/env node")) {
    return false;
  }

  const lines = text.split(/\r?\n/);
  const shebangIndex = lines.findIndex((line) => line.trim() === "#!/usr/bin/env node");
  if (shebangIndex <= 0) {
    return false;
  }

  lines.splice(shebangIndex, 1);
  lines.unshift("#!/usr/bin/env node");
  fs.writeFileSync(file, lines.join("\n"), "utf8");
  return true;
}

let changed = 0;

for (const dir of TARGET_DIRS) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) {
    continue;
  }

  for (const file of walk(abs)) {
    if (!SCRIPT_EXTS.has(path.extname(file))) {
      continue;
    }
    if (fixShebang(file)) {
      changed += 1;
      console.log("Fixed shebang:", file);
    }
  }
}

console.log(`Done. Fixed ${changed} files.`);
