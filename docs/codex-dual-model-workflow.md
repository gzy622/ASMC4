# Codex Dual Model Workflow

This project uses a strong-planner, small-worker Codex workflow.

## Roles

- Main thread: use `gpt-5.5` for planning, coordination, and final review.
- `mini_worker`: use `gpt-5.4-mini` for small, scoped implementation tasks from an approved plan.

## How to Use

1. Keep planning and final review in the main thread.
2. Split implementation into small phases.
3. The main thread decides whether a phase is worth delegating to `mini_worker`.
4. Give `mini_worker` an explicit file list, command list, and expected result.
5. After each phase, the main thread must review the diff before assigning the next phase.

## Delegation Rules

The main thread should use `mini_worker` without asking the user only when all of these are true:

- The task is already planned and the next phase is clear.
- The phase touches a small, explicit file list, usually 2-5 files.
- The change is local and easy to review.
- The command or check to run is known.
- The implementation is mechanical enough that delegation saves main-thread attention.
- The expected implementation work is larger than the coordination cost of briefing, waiting for, and reviewing a subagent.
- The phase does not involve security, authentication, authorization, payment, database migration, concurrency, or data consistency decisions.

The main thread should keep the work itself when:

- The task is a one-line or single-file trivial edit, such as copy text, a small CSS tweak, or a tiny config change.
- The task needs planning, broad design judgment, risky decisions, or final review.
- Delegating would require more explanation and review work than doing the edit directly.

## Handoff Rules

`mini_worker` must stop and return control to the main thread when:

- It fails twice in a row.
- It needs to edit files outside the assigned file list.
- It hits security, authentication, authorization, payment, database migration, concurrency, or data-consistency questions.
- The plan is ambiguous, wrong, incomplete, or risky.
- A referenced file path, command, dependency, or test does not exist.

## Model Switching

Do not frequently switch models inside the same long thread. Keep the main thread on `gpt-5.5`, and delegate narrow execution phases to `mini_worker`.

## Loading

If this configuration was just created, Codex may need a restart or a new thread before the custom agent is loaded.
