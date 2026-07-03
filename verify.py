from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parent


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


index_html = read("index.html")
build_script = read("build.mjs")
dom_refs = read("src/js/dom-refs.js")
html_stylesheets = re.findall(r'<link rel="stylesheet" href="([^"]+)"\s*/>', index_html)
html_module_scripts = re.findall(r'<script type="module" src="([^"]+)"></script>', index_html)
html_ids = set(re.findall(r'\bid="([^"]+)"', index_html))
dom_ref_ids = set(re.findall(r'querySelector\("#([^"]+)"\)', dom_refs))

checks = [
    (
        "dom id refs exist",
        dom_ref_ids.issubset(html_ids),
    ),
    (
        "html stylesheet refs exist",
        bool(html_stylesheets)
        and all((ROOT / href).is_file() for href in html_stylesheets),
    ),
    (
        "html module script refs exist",
        bool(html_module_scripts)
        and all((ROOT / src).is_file() for src in html_module_scripts),
    ),
    (
        "build bundles html stylesheets",
        all(f'"{Path(href).name}"' in build_script for href in html_stylesheets),
    ),
    (
        "build rewrites module entry",
        '<script type="module" src="src/js/app.js"></script>' in build_script
        and '<script type="module" src="src/js/app.js"></script>' in index_html,
    ),
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
        "student ids are escaped",
        "const safeId = escapeHTML(student.id);" in read("src/js/render/students.js"),
    ),
    (
        "roster id matching uses strings",
        "oldMap.get(String(entry.id))" in read("src/js/business/roster.js"),
    ),
    (
        "non-history save keeps history entries",
        "if (!history)" in read("src/js/state.js")
        and "historyEntries.length = historyIndex + 1;" in read("src/js/state.js").split(
            "if (!history)"
        )[1],
    ),
    (
        "successful import closes confirmation",
        "closeConfirm();" in read("src/js/ui/backup.js"),
    ),
    (
        "long press consumes Android synthetic click",
        "setSuppressNextCardClick(true);" in read("src/js/score-sheet/longpress.js"),
    ),
    (
        "Android WebView native long-press haptics disabled",
        "webView.setHapticFeedbackEnabled(false);" in read(
            "android/app/src/main/java/com/gzy622/asmc4/MainActivity.java"
        ),
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
