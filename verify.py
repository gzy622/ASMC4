from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


checks = [
    ("module entry binds events", "bindEvents();" in read("src/js/app.js")),
    (
        "event domains are split",
        all(
            (ROOT / "src/js/events" / name).is_file()
            for name in (
                "assignments.js",
                "backup.js",
                "navigation.js",
                "score.js",
                "students.js",
            )
        ),
    ),
    (
        "score sheet opening is non-destructive",
        'student.badge = "";' not in read("src/js/score-sheet/index.js").split(
            "export function closeScoreSheet"
        )[0],
    ),
    (
        "rename cancellation is guarded",
        "let settled = false;" in read("src/js/business/assignment.js"),
    ),
    (
        "assignment ids are escaped",
        "const safeId = escapeHTML(assignment.id);" in read(
            "src/js/render/assignmentList.js"
        ),
    ),
    (
        "successful import closes confirmation",
        "closeConfirm();" in read("src/js/ui/backup.js"),
    ),
    (
        "long press survives release until click",
        "longPressResetTimer = setTimeout" in read("src/js/score-sheet/longpress.js"),
    ),
]

for js_file in sorted((ROOT / "src/js").rglob("*.js")):
    result = subprocess.run(
        ["node", "--check", str(js_file)],
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    checks.append((f"syntax: {js_file.relative_to(ROOT)}", result.returncode == 0))
    if result.returncode != 0:
        print(result.stderr)

all_ok = True
for name, ok in checks:
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    all_ok = all_ok and ok

print()
print(f"Overall: {'PASSED' if all_ok else 'FAILED'}")
sys.exit(0 if all_ok else 1)
