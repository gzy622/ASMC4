with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

checks = [
    ("assignment-edit-input CSS class", ".assignment-edit-input" in c),
    ("no prompt() call", "prompt(" not in c.split("function renameAssignment")[1].split("function toggleStudent")[0]),
    ("data-assignment-id on .assignment-name", 'data-assignment-id="${assignment.id}"' in c),
    ("input guard in click handler", '".assignment-edit-input"' in c),
    ("input.maxLength = 24", "maxLength = 24" in c),
    ("input.blur() on Enter", 'input.blur()' in c),
    ("Escape cancel", 'e.key === "Escape"' in c),
    ("commit() function", "function commit()" in c),
    ("cancel() function", "function cancel()" in c),
    ("aria-label on edit input", "编辑作业名称" in c),
]

all_ok = True
for name, ok in checks:
    status = "PASS" if ok else "FAIL"
    if not ok: all_ok = False
    print(f"  [{status}] {name}")

print()
print(f"Overall: {'PASSED' if all_ok else 'FAILED'}")
print(f"File size: {len(c)} bytes, lines: {c.count(chr(10)) + 1}")
