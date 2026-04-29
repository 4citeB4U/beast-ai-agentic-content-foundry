import csv
import re
from collections import Counter
from pathlib import Path

root = Path(r"D:\LeeWay_Product_Line")
inventory_candidates = sorted(root.glob("full-inventory_*.csv"))
if not inventory_candidates:
    raise FileNotFoundError("No inventory CSV files found under the workspace root.")

inv = inventory_candidates[-1]
ledger = root / "cleanup-ledger.csv"
del_batch = root / "delete-batch-001.csv"
move_map = root / "move-map-initial.csv"
report = root / "contamination-report.md"

with inv.open("r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.DictReader(f))

ignore_rx = re.compile(
    r"(\\receipts(\\|$)|\\move-apply-backups(\\|$)|\\inventory-log_\d+_\d+\.txt$|\\full-inventory_\d+_\d+\.(txt|csv)$|\\cleanup-ledger\.csv$|\\move-map-initial\.csv$|\\delete-batch-001\.csv$)",
    re.I,
)
rows = [r for r in rows if not ignore_rx.search(str(r.get("FullName", "")))]


def top_repo(path: str) -> str:
    p = path.replace("/", "\\")
    r = str(root)
    if not p.lower().startswith(r.lower()):
        return "External"
    rel = p[len(r):].lstrip("\\")
    if not rel:
        return "ROOT"
    return rel.split("\\", 1)[0]


def current_owner(repo: str) -> str:
    m = {
        "leeway-standards": "LeeWay-Standards",
        "leeway-edge-integrated": "LeeWay-Edge-Integrated",
        "leeway-edge-rtc-main": "LeeWay-Edge-RTC-main",
        "leewayedgewebgpu": "LeewayEdgeWebGPU",
        "agent-lee-agentic-os": "agent-lee-agentic-os",
        "leeway-agents-the-world-within": "LeeWay-Agents-the-World-Within",
        "__quarantine__": "__quarantine__",
        "root": "ROOT",
    }
    return m.get(repo.lower(), "External")


secret_rx = re.compile(r"(serviceaccountkey\.json|\.pem$|\.key$|id_rsa|credentials|secret|\.pfx$|\.env\.local$|\.env$)", re.I)
media_or_state_rx = re.compile(r"(\.mp4$|\.mov$|\.avi$|\.mkv$|\.zip$|\.7z$|\.rar$|\.db$)", re.I)
rtc_rx = re.compile(r"(rtc|signaling|transport|webrtc|voice-engine|tts-bridge|rtcbootstrap|rtcinitializer)", re.I)
gpu_rx = re.compile(r"(webgpu|gpu|shader|pipeline|compute|worker)", re.I)
gov_rx = re.compile(r"(governance|contract|policy|validator|standards|compliance|ssa|executionlayer|sovereignruntime|intentsanitizer)", re.I)
int_rx = re.compile(r"(shell|motherboard|orchestrat|control.?plane|integrat|runtime/spec|manifest\.webmanifest|service-worker)", re.I)

artifact_rx = re.compile(r"(playwright-report|test-results|reports|logs|__pycache__|\.pyc$|\.crdownload$|coverage|dist|buildlog|inventory-log|full-inventory)", re.I)
dup_rx = re.compile(r"(copy($|\\)|duplicate|backup|\(copy\)| - copy)", re.I)
test_rx = re.compile(r"(test|spec|playwright|verificationtest|audit)", re.I)
config_rx = re.compile(r"(\.json$|\.yaml$|\.yml$|\.toml$|\.config\.|tsconfig|vite\.config|package\.json|dockerfile|manifest)", re.I)
ui_rx = re.compile(r"(ui|component|page|app\.tsx|index\.tsx|index\.html|index\.css|persona|studio|public)", re.I)
runtime_rx = re.compile(r"(runtime|rtc|signaling|transport|gpu|webgpu|worker|pipeline|engine|core|cortices|functions)", re.I)


def correct_owner(path: str, repo: str) -> str:
    p = path.lower()
    if repo == "__quarantine__":
        return "External"
    if secret_rx.search(p):
        return "External"
    if media_or_state_rx.search(p):
        return "External"
    if rtc_rx.search(p):
        return "RTC"
    if gpu_rx.search(p):
        return "WebGPU"
    if gov_rx.search(p):
        return "Standards"
    if int_rx.search(p):
        return "Integrated"
    if repo == "LeeWay-Standards":
        return "Standards"
    if repo == "LeeWay-Edge-Integrated":
        return "Integrated"
    if repo == "LeeWay-Edge-RTC-main":
        return "RTC"
    if repo == "LeewayEdgeWebGPU":
        return "WebGPU"
    if repo in {"agent-lee-agentic-os", "LeeWay-Agents-the-World-Within"}:
        return "Projection"
    return "External"


def file_role(path: str, is_dir: bool) -> str:
    p = path.lower()
    if secret_rx.search(p):
        return "secret"
    if artifact_rx.search(p):
        return "artifact"
    if dup_rx.search(p) or "leeway-standards\\leeway-standards" in p:
        return "duplicate"
    if re.search(r"(\.png$|\.jpg$|\.jpeg$|\.gif$|\.svg$|\.webp$|\.mp4$|\.mov$|\.mp3$|\.wav$|\.ico$)", p):
        return "media"
    if test_rx.search(p):
        return "test"
    if config_rx.search(p):
        return "config"
    if ui_rx.search(p):
        return "ui"
    if gov_rx.search(p):
        return "governance"
    if runtime_rx.search(p):
        return "runtime"
    return "orphan"


def owner_norm(cur: str) -> str:
    return {
        "LeeWay-Standards": "Standards",
        "LeeWay-Edge-Integrated": "Integrated",
        "LeeWay-Edge-RTC-main": "RTC",
        "LeewayEdgeWebGPU": "WebGPU",
        "agent-lee-agentic-os": "Projection",
        "LeeWay-Agents-the-World-Within": "Projection",
    }.get(cur, "External")


def action(path: str, cur: str, corr: str, role: str) -> str:
    p = path.lower()
    if role == "secret":
        return "EXTERNALIZE"
    if re.search(r"(playwright-report|test-results|__pycache__|\.pyc$|\.crdownload$|coverage|buildlog|inventory-log_\d+_\d+\.txt|full-inventory_\d+_\d+\.(txt|csv))", p):
        return "DELETE"
    if role == "duplicate" or re.search(r"(agent_lee_persona_system - copy|leeway-standards\\leeway-standards)", p):
        return "DELETE"
    if cur == "__quarantine__":
        return "QUARANTINE"
    if corr == "External" and cur != "External":
        return "EXTERNALIZE"
    if corr != owner_norm(cur) and corr != "External":
        return "MOVE"
    return "KEEP"


def risk(act: str, role: str, path: str) -> str:
    p = path.lower()
    if act == "DELETE":
        if re.search(r"(playwright-report|test-results|__pycache__|\.pyc$|\.crdownload$|coverage|inventory-log_|full-inventory_)", p):
            return "low"
        if role in {"artifact", "duplicate"}:
            return "low"
        return "medium"
    if act == "MOVE":
        if role in {"runtime", "governance"} or re.search(r"(core|cortices|services|functions|agents)", p):
            return "medium"
        return "low"
    if act == "EXTERNALIZE":
        return "high"
    if act == "QUARANTINE":
        return "medium"
    return "low"


def reason(path: str, act: str, cur: str, corr: str, role: str) -> str:
    p = path.lower()
    if act == "DELETE":
        if "agent_lee_persona_system - copy" in p:
            return "Duplicate copy directory; non-canonical projection duplicate."
        if "leeway-standards\\leeway-standards" in p:
            return "Nested duplicate Standards tree inside projection repo."
        if re.search(r"(playwright-report|test-results|reports|logs|__pycache__|\.pyc$|\.crdownload$|inventory-log_|full-inventory_)", p):
            return "Generated artifact/log/cache not allowed in active source tree."
        return "Low-value duplicate/artifact safe for removal."
    if act == "MOVE":
        return f"Ownership mismatch: belongs to {corr} layer, currently in {cur}."
    if act == "EXTERNALIZE":
        if role == "secret":
            return "Sensitive secret/config must be externalized from repo."
        return "Binary/runtime-state/local file should be externalized."
    if act == "QUARANTINE":
        return "Already quarantined or uncertain ownership; retain for review."
    return "Aligned with current ownership and layer role."


ledger_rows = []
for r in rows:
    path = r["FullName"]
    is_dir = str(r["PSIsContainer"]).strip().lower() == "true"
    repo = top_repo(path)
    cur = current_owner(repo)
    corr = correct_owner(path, repo)
    role = file_role(path, is_dir)
    act = action(path, cur, corr, role)
    rk = risk(act, role, path)
    rs = reason(path, act, cur, corr, role)
    ledger_rows.append(
        {
            "path": path,
            "current_owner": cur,
            "correct_owner": corr,
            "action": act,
            "reason": rs,
            "risk": rk,
            "file_role": role,
        }
    )

fields = ["path", "current_owner", "correct_owner", "action", "reason", "risk", "file_role"]
with ledger.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(ledger_rows)

with del_batch.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows([x for x in ledger_rows if x["action"] == "DELETE" and x["risk"] == "low"])

with move_map.open("w", encoding="utf-8", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows([x for x in ledger_rows if x["action"] == "MOVE" and x["risk"] == "low"])

nested_standards = [
    x
    for x in ledger_rows
    if re.search(
        r"\\agent-lee-agentic-os\\LeeWay-Standards(\\|$)|\\LeeWay-Agents-the-World-Within\\LeeWay-Standards(\\|$)",
        x["path"],
        re.I,
    )
]
duplicate_dirs = [
    x
    for x in ledger_rows
    if x["file_role"] == "duplicate" or re.search(r"( - Copy(\\|$)|leeway-standards\\leeway-standards)", x["path"], re.I)
]
runtime_in_projection = [
    x
    for x in ledger_rows
    if x["current_owner"] in {"agent-lee-agentic-os", "LeeWay-Agents-the-World-Within"} and x["file_role"] == "runtime"
]
gov_outside = [x for x in ledger_rows if x["file_role"] == "governance" and x["current_owner"] != "LeeWay-Standards"]
rtc_outside = [
    x
    for x in ledger_rows
    if re.search(r"(rtc|signaling|transport|webrtc)", x["path"], re.I) and x["current_owner"] != "LeeWay-Edge-RTC-main"
]
gpu_outside = [
    x
    for x in ledger_rows
    if re.search(r"(webgpu|gpu|shader|pipeline|compute|worker)", x["path"], re.I) and x["current_owner"] != "LeewayEdgeWebGPU"
]
test_report_active = [
    x
    for x in ledger_rows
    if re.search(r"(playwright-report|test-results|reports|docs\\logs|docs\\tests\\test-results|coverage)", x["path"], re.I)
]
secrets = [x for x in ledger_rows if x["file_role"] == "secret"]

owner_flags = Counter(x["current_owner"] for x in ledger_rows if x["action"] in {"MOVE", "DELETE", "EXTERNALIZE", "QUARANTINE"})

md = []
md.append("# contamination-report")
md.append("")
md.append("## summary")
md.append(f"- total_inventory_items: {len(ledger_rows)}")
for k in ["KEEP", "DELETE", "MOVE", "EXTERNALIZE", "QUARANTINE"]:
    md.append(f"- actions_{k.lower()}: {sum(1 for x in ledger_rows if x['action'] == k)}")
md.append("")
md.append("## structural_violations_by_owner")
for owner, cnt in owner_flags.most_common(10):
    md.append(f"- {owner}: {cnt} flagged items")
md.append("")
md.append("## mandatory_flags")
md.append(f"1. nested_standards_inside_projection: {len(nested_standards)}")
md.append(f"2. duplicate_directories_or_copy_structures: {len(duplicate_dirs)}")
md.append(f"3. runtime_logic_inside_projection_repos: {len(runtime_in_projection)}")
md.append(f"4. governance_logic_outside_standards: {len(gov_outside)}")
md.append(f"5. rtc_logic_outside_rtc_repo: {len(rtc_outside)}")
md.append(f"6. gpu_compute_logic_outside_webgpu_repo: {len(gpu_outside)}")
md.append(f"7. test_report_log_folders_in_active_paths: {len(test_report_active)}")
md.append(f"8. secrets_inside_repos: {len(secrets)}")
md.append("")
md.append("## duplicated_systems")
for x in duplicate_dirs[:200]:
    md.append(f"- {x['path']}")
md.append("")
md.append("## nested_repos")
nested_repos = [
    x
    for x in ledger_rows
    if re.search(
        r"\\agent-lee-agentic-os\\(LeeWay-Standards|LeeWay-Edge-RTC-main|LeeWay-Edge-Integrated|LeewayEdgeWebGPU)(\\|$)|\\LeeWay-Agents-the-World-Within\\LeeWay-Standards(\\|$)",
        x["path"],
        re.I,
    )
]
for x in nested_repos[:200]:
    md.append(f"- {x['path']}")
md.append("")
md.append("## critical_secrets")
for x in secrets:
    md.append(f"- {x['path']}")

report.write_text("\n".join(md), encoding="utf-8")

print(f"WROTE ledger={ledger} rows={len(ledger_rows)}")
print(f"WROTE delete_batch={del_batch} rows={sum(1 for x in ledger_rows if x['action'] == 'DELETE' and x['risk'] == 'low')}")
print(f"WROTE move_map={move_map} rows={sum(1 for x in ledger_rows if x['action'] == 'MOVE' and x['risk'] == 'low')}")
print(f"WROTE report={report}")
